"""
Generate sample MMM data for testing.
Creates realistic weekly marketing data similar to Robyn's dt_simulated_weekly.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional


def generate_sample_data(
    start_date: str = "2020-01-06",
    weeks: int = 156,  # 3 years
    seed: Optional[int] = 42
) -> pd.DataFrame:
    """
    Generate sample weekly marketing data.

    Args:
        start_date: First week start date (YYYY-MM-DD)
        weeks: Number of weeks to generate
        seed: Random seed for reproducibility

    Returns:
        DataFrame with columns: date, revenue, spend_meta, spend_google,
        spend_tiktok, spend_email, promo_flag
    """
    if seed is not None:
        np.random.seed(seed)

    # Generate date range
    start = datetime.strptime(start_date, "%Y-%m-%d")
    dates = [start + timedelta(weeks=i) for i in range(weeks)]

    # Base revenue with trend and seasonality
    t = np.arange(weeks)
    trend = 500000 + 1000 * t  # Gradual growth
    yearly_seasonality = 50000 * np.sin(2 * np.pi * t / 52)  # Annual cycle
    weekly_noise = np.random.normal(0, 20000, weeks)
    base_revenue = trend + yearly_seasonality + weekly_noise

    # Generate spend for each channel with some correlation to revenue
    # Meta: high spend, medium ROI
    spend_meta = np.random.uniform(30000, 80000, weeks)
    spend_meta = spend_meta * (1 + 0.3 * yearly_seasonality / 50000)  # Seasonal scaling

    # Google: medium spend, high ROI
    spend_google = np.random.uniform(20000, 50000, weeks)
    spend_google = spend_google * (1 + 0.2 * yearly_seasonality / 50000)

    # TikTok: lower spend, variable ROI (newer channel)
    tiktok_start = 52  # Started after 1 year
    spend_tiktok = np.zeros(weeks)
    spend_tiktok[tiktok_start:] = np.random.uniform(5000, 25000, weeks - tiktok_start)
    spend_tiktok[tiktok_start:] = spend_tiktok[tiktok_start:] * (1 + 0.1 * t[tiktok_start:] / 100)

    # Email: low spend, high ROI (owned channel)
    spend_email = np.random.uniform(2000, 8000, weeks)

    # Calculate revenue contribution from each channel (simplified)
    # Real Robyn uses adstock and saturation transformations
    meta_effect = 2.5 * spend_meta * np.random.uniform(0.9, 1.1, weeks)
    google_effect = 3.5 * spend_google * np.random.uniform(0.9, 1.1, weeks)
    tiktok_effect = 1.8 * spend_tiktok * np.random.uniform(0.8, 1.2, weeks)
    email_effect = 5.0 * spend_email * np.random.uniform(0.9, 1.1, weeks)

    # Total revenue = base + channel effects
    revenue = base_revenue + meta_effect + google_effect + tiktok_effect + email_effect

    # Add promotions (random weeks)
    promo_flag = np.random.choice([0, 1], size=weeks, p=[0.85, 0.15])
    promo_effect = promo_flag * np.random.uniform(30000, 100000, weeks)
    revenue = revenue + promo_effect

    # Ensure positive values and round
    revenue = np.maximum(revenue, 100000).round(0)
    spend_meta = spend_meta.round(0)
    spend_google = spend_google.round(0)
    spend_tiktok = spend_tiktok.round(0)
    spend_email = spend_email.round(0)

    # Create DataFrame
    df = pd.DataFrame({
        "date": [d.strftime("%Y-%m-%d") for d in dates],
        "revenue": revenue.astype(int),
        "spend_meta": spend_meta.astype(int),
        "spend_google": spend_google.astype(int),
        "spend_tiktok": spend_tiktok.astype(int),
        "spend_email": spend_email.astype(int),
        "promo_flag": promo_flag
    })

    return df


def save_sample_data(filepath: str, **kwargs) -> str:
    """Generate and save sample data to CSV."""
    df = generate_sample_data(**kwargs)
    df.to_csv(filepath, index=False)
    return filepath


if __name__ == "__main__":
    # Generate sample data for testing
    df = generate_sample_data()
    print(df.head(10))
    print(f"\nTotal rows: {len(df)}")
    print(f"Date range: {df['date'].iloc[0]} to {df['date'].iloc[-1]}")
    print(f"\nColumn stats:")
    print(df.describe())
