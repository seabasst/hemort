import os
from typing import Optional, List, Dict, Any
import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account


class BigQueryService:
    """Service for fetching data from BigQuery."""

    def __init__(self, project_id: str, credentials_path: Optional[str] = None):
        self.project_id = project_id

        # Initialize client
        if credentials_path:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            self.client = bigquery.Client(
                project=project_id,
                credentials=credentials
            )
        else:
            # Use default credentials (from environment)
            self.client = bigquery.Client(project=project_id)

    def fetch_table(self, dataset: str, table: str) -> pd.DataFrame:
        """Fetch entire table as DataFrame."""
        query = f"""
        SELECT *
        FROM `{self.project_id}.{dataset}.{table}`
        ORDER BY date
        """
        return self.client.query(query).to_dataframe()

    def fetch_query(self, query: str) -> pd.DataFrame:
        """Execute custom query and return as DataFrame."""
        return self.client.query(query).to_dataframe()

    def list_tables(self, dataset: str) -> list:
        """List all tables in a dataset."""
        dataset_ref = self.client.dataset(dataset)
        tables = list(self.client.list_tables(dataset_ref))
        return [table.table_id for table in tables]

    def get_table_schema(self, dataset: str, table: str) -> list:
        """Get schema of a table."""
        table_ref = self.client.dataset(dataset).table(table)
        table = self.client.get_table(table_ref)
        return [
            {"name": field.name, "type": field.field_type}
            for field in table.schema
        ]

    def preview_table(self, dataset: str, table: str, limit: int = 10) -> pd.DataFrame:
        """Preview first N rows of a table."""
        query = f"""
        SELECT *
        FROM `{self.project_id}.{dataset}.{table}`
        LIMIT {limit}
        """
        return self.client.query(query).to_dataframe()

    def list_datasets(self) -> List[str]:
        """List all datasets in the project."""
        datasets = list(self.client.list_datasets())
        return [ds.dataset_id for ds in datasets]

    def build_mmm_query(
        self,
        dataset: str,
        revenue_table: str,
        revenue_date_col: str,
        revenue_col: str,
        spend_tables: List[Dict[str, str]],
        aggregation: str = "weekly"
    ) -> str:
        """
        Build MMM query joining revenue with multiple spend sources.

        Args:
            dataset: BigQuery dataset ID
            revenue_table: Table with revenue data
            revenue_date_col: Column name for date in revenue table
            revenue_col: Column name for revenue value
            spend_tables: List of dicts with keys:
                - table: table name
                - date_col: date column
                - spend_col: spend column
                - alias: channel name (e.g., 'meta', 'google')
            aggregation: 'daily' or 'weekly'
        """
        project = self.project_id

        # Build revenue CTE
        ctes = [f"""
daily_revenue AS (
  SELECT
    DATE({revenue_date_col}) as date,
    SUM(CAST({revenue_col} AS FLOAT64)) as revenue
  FROM `{project}.{dataset}.{revenue_table}`
  WHERE {revenue_date_col} IS NOT NULL
  GROUP BY 1
)"""]

        # Build spend CTEs
        spend_aliases = []
        for st in spend_tables:
            alias = st['alias']
            spend_aliases.append(alias)
            ctes.append(f"""
{alias}_spend AS (
  SELECT
    DATE({st['date_col']}) as date,
    SUM(CAST({st['spend_col']} AS FLOAT64)) as {alias}_spend
  FROM `{project}.{dataset}.{st['table']}`
  WHERE {st['date_col']} IS NOT NULL
  GROUP BY 1
)""")

        # Build daily combined CTE
        join_clauses = "\n".join([
            f"  LEFT JOIN {alias}_spend {alias[0]} ON r.date = {alias[0]}.date"
            for alias in spend_aliases
        ])

        coalesce_cols = ", ".join([
            f"COALESCE({alias[0]}.{alias}_spend, 0) as {alias}_spend"
            for alias in spend_aliases
        ])

        ctes.append(f"""
daily_combined AS (
  SELECT
    r.date,
    r.revenue,
    {coalesce_cols}
  FROM daily_revenue r
{join_clauses}
)""")

        # Build final select
        spend_sums = ", ".join([f"SUM({alias}_spend) as {alias}_S" for alias in spend_aliases])

        if aggregation == "weekly":
            query = f"""
WITH {', '.join(ctes)}

SELECT
  DATE_TRUNC(date, WEEK(MONDAY)) as DATE,
  SUM(revenue) as revenue,
  {spend_sums}
FROM daily_combined
GROUP BY 1
ORDER BY 1
"""
        else:
            query = f"""
WITH {', '.join(ctes)}

SELECT
  date as DATE,
  revenue,
  {', '.join([f"{alias}_spend as {alias}_S" for alias in spend_aliases])}
FROM daily_combined
ORDER BY 1
"""
        return query

    def fetch_mmm_data(
        self,
        dataset: str,
        revenue_table: str,
        revenue_date_col: str,
        revenue_col: str,
        spend_tables: List[Dict[str, str]],
        aggregation: str = "weekly"
    ) -> pd.DataFrame:
        """
        Fetch MMM-ready data by combining revenue and spend sources.
        """
        query = self.build_mmm_query(
            dataset=dataset,
            revenue_table=revenue_table,
            revenue_date_col=revenue_date_col,
            revenue_col=revenue_col,
            spend_tables=spend_tables,
            aggregation=aggregation
        )
        return self.client.query(query).to_dataframe()
