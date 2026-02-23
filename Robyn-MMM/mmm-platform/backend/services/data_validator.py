from typing import Optional, Tuple, Dict, List
from datetime import datetime
import pandas as pd
import numpy as np


class DataValidator:
    """Validates MMM data for Robyn compatibility."""

    REQUIRED_MIN_ROWS = 52  # At least 1 year of weekly data
    DATE_COLUMN_NAMES = ["date", "week", "week_start", "week_date"]
    REVENUE_COLUMN_NAMES = ["revenue", "sales", "total_revenue", "conversions"]

    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.date_column: Optional[str] = None
        self.messages: List[str] = []

    def validate(self) -> Dict:
        """Run all validations and return result."""
        self.messages = []
        status = "valid"

        # Check for empty data
        if len(self.df) == 0:
            self.messages.append("Dataset is empty")
            return {"status": "error", "messages": self.messages}

        # Check minimum rows
        if len(self.df) < self.REQUIRED_MIN_ROWS:
            self.messages.append(
                f"Dataset has {len(self.df)} rows, minimum {self.REQUIRED_MIN_ROWS} required"
            )
            status = "warning"

        # Detect and validate date column
        self._detect_date_column()
        if not self.date_column:
            self.messages.append("No date column detected. Expected: date, week, week_start")
            status = "error"
        else:
            # Validate date format
            try:
                self.df[self.date_column] = pd.to_datetime(self.df[self.date_column])
            except Exception:
                self.messages.append(f"Could not parse '{self.date_column}' as dates")
                status = "error"

        # Check for revenue column
        revenue_col = self._detect_column(self.REVENUE_COLUMN_NAMES)
        if not revenue_col:
            self.messages.append("No revenue column detected. Expected: revenue, sales, conversions")
            status = "warning" if status != "error" else status

        # Check for nulls
        null_counts = self.df.isnull().sum()
        cols_with_nulls = null_counts[null_counts > 0]
        if len(cols_with_nulls) > 0:
            for col, count in cols_with_nulls.items():
                self.messages.append(f"Column '{col}' has {count} missing values")
            if status != "error":
                status = "warning"

        # Check for spend columns (support both 'spend' and '_S' suffix conventions)
        spend_cols = [c for c in self.df.columns if "spend" in c.lower() or c.endswith("_S")]
        if not spend_cols:
            self.messages.append("No spend columns detected (expected columns containing 'spend' or ending with '_S')")
            if status != "error":
                status = "warning"

        # Check for duplicate dates
        if self.date_column and self.date_column in self.df.columns:
            duplicates = self.df[self.date_column].duplicated().sum()
            if duplicates > 0:
                self.messages.append(f"Found {duplicates} duplicate dates")
                if status != "error":
                    status = "warning"

        # Check for missing weeks
        if self.date_column and status != "error":
            self._check_missing_weeks()

        if not self.messages:
            self.messages.append("Data validation passed")

        return {"status": status, "messages": self.messages}

    def _detect_date_column(self) -> None:
        """Detect the date column."""
        columns_lower = {c.lower(): c for c in self.df.columns}
        for name in self.DATE_COLUMN_NAMES:
            if name in columns_lower:
                self.date_column = columns_lower[name]
                return

    def _detect_column(self, candidates: List[str]) -> Optional[str]:
        """Detect a column from a list of candidates."""
        columns_lower = {c.lower(): c for c in self.df.columns}
        for name in candidates:
            if name in columns_lower:
                return columns_lower[name]
        return None

    def _check_missing_weeks(self) -> None:
        """Check for gaps in weekly data."""
        if self.date_column not in self.df.columns:
            return

        try:
            dates = pd.to_datetime(self.df[self.date_column]).sort_values()
            if len(dates) < 2:
                return

            # Calculate expected weekly frequency
            date_diffs = dates.diff().dropna()
            median_diff = date_diffs.median()

            # Check if data is roughly weekly
            if median_diff.days < 5 or median_diff.days > 9:
                self.messages.append(
                    f"Data may not be weekly (median interval: {median_diff.days} days)"
                )
                return

            # Check for gaps
            gaps = date_diffs[date_diffs > pd.Timedelta(days=10)]
            if len(gaps) > 0:
                self.messages.append(f"Found {len(gaps)} gaps in weekly data")

        except Exception:
            pass

    def get_date_range(self) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Get the date range of the data."""
        if not self.date_column or self.date_column not in self.df.columns:
            # Try to detect date column
            self._detect_date_column()

        if not self.date_column or self.date_column not in self.df.columns:
            return None, None

        try:
            dates = pd.to_datetime(self.df[self.date_column])
            return dates.min().to_pydatetime(), dates.max().to_pydatetime()
        except Exception:
            return None, None

    def get_detected_channels(self) -> List[str]:
        """Get list of detected spend channels."""
        channels = []
        for c in self.df.columns:
            if "spend" in c.lower():
                channels.append(c.replace("spend_", "").replace("_spend", ""))
            elif c.endswith("_S"):
                channels.append(c[:-2])  # Remove _S suffix
        return channels
