import os
import json
import subprocess
import tempfile
from typing import Dict, Any, Optional, List
import pandas as pd

from config import R_SCRIPTS_DIR


class RobynRunner:
    """Python wrapper for executing Robyn R scripts."""

    def __init__(self, r_script_path: str = None):
        self.r_script_path = r_script_path or os.path.join(R_SCRIPTS_DIR, "robyn_template.R")

    def run(
        self,
        data_path: str,
        config: Dict[str, Any],
        output_dir: str
    ) -> Dict[str, Any]:
        """
        Run Robyn model with the given configuration.

        Args:
            data_path: Path to CSV data file
            config: Model configuration (columns, hyperparameters)
            output_dir: Directory to save outputs

        Returns:
            Dictionary with model results
        """
        os.makedirs(output_dir, exist_ok=True)

        # Create config JSON file
        config_path = os.path.join(output_dir, "config.json")
        with open(config_path, "w") as f:
            json.dump({
                "data_path": data_path,
                "output_dir": output_dir,
                **config
            }, f, indent=2)

        # Generate R script
        r_script = self._generate_r_script(config, data_path, output_dir)
        script_path = os.path.join(output_dir, "run_robyn.R")
        with open(script_path, "w") as f:
            f.write(r_script)

        # Execute R script
        try:
            result = subprocess.run(
                ["Rscript", script_path],
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )

            if result.returncode != 0:
                raise Exception(f"R script failed: {result.stderr}")

        except subprocess.TimeoutExpired:
            raise Exception("Model run timed out after 1 hour")

        # Parse results
        return self._parse_results(output_dir)

    def _generate_r_script(
        self,
        config: Dict[str, Any],
        data_path: str,
        output_dir: str
    ) -> str:
        """Generate the R script to run Robyn."""

        spend_columns = config.get("spend_columns", [])
        date_column = config.get("date_column", "date")
        revenue_column = config.get("revenue_column", "revenue")
        control_columns = config.get("control_columns", [])

        # Build media variables string
        media_vars = ", ".join([f'"{c}"' for c in spend_columns])

        # Build control variables string
        control_vars = ""
        if control_columns:
            control_vars = ", ".join([f'"{c}"' for c in control_columns])

        # Adstock and saturation config
        adstock = config.get("adstock", {"theta": {"min": 0.0, "max": 0.9}})
        saturation = config.get("saturation", {
            "alpha": {"min": 0.5, "max": 3.0},
            "gamma": {"min": 0.3, "max": 1.0}
        })

        iterations = config.get("iterations", 2000)
        trials = config.get("trials", 5)

        script = f'''
# Robyn MMM Script - Auto-generated

# Configure Python for nevergrad
library(reticulate)
use_python("/usr/bin/python3", required = TRUE)

library(Robyn)

# Set output directory
robyn_directory <- "{output_dir}"

# Load data
data <- read.csv("{data_path}")

# Convert date column
data${date_column} <- as.Date(data${date_column})

# Define media spend columns
media_spend_cols <- c({media_vars})

# Verify columns exist
missing_cols <- setdiff(media_spend_cols, names(data))
if (length(missing_cols) > 0) {{
  stop(paste("Missing columns:", paste(missing_cols, collapse=", ")))
}}

cat("Data loaded successfully\\n")
cat(sprintf("Rows: %d, Date range: %s to %s\\n",
            nrow(data),
            min(data${date_column}),
            max(data${date_column})))

# Build hyperparameters FIRST (Robyn 3.12+ approach)
hyperparameters <- list()
for (media in media_spend_cols) {{
  hyperparameters[[paste0(media, "_alphas")]] <- c({saturation['alpha']['min']}, {saturation['alpha']['max']})
  hyperparameters[[paste0(media, "_gammas")]] <- c({saturation['gamma']['min']}, {saturation['gamma']['max']})
  hyperparameters[[paste0(media, "_thetas")]] <- c({adstock['theta']['min']}, {adstock['theta']['max']})
}}

cat("Hyperparameters configured for channels:", paste(media_spend_cols, collapse=", "), "\\n")

# Create InputCollect with hyperparameters included
# Note: prophet_vars removed for small datasets (< 2 years)
InputCollect <- robyn_inputs(
  dt_input = data,
  dt_holidays = dt_prophet_holidays,
  date_var = "{date_column}",
  dep_var = "{revenue_column}",
  dep_var_type = "revenue",
  prophet_country = "SE",
  paid_media_spends = media_spend_cols,
  paid_media_vars = media_spend_cols,
  {'context_vars = c(' + control_vars + '),' if control_vars else ''}
  window_start = min(data${date_column}),
  window_end = max(data${date_column}),
  adstock = "geometric",
  hyperparameters = hyperparameters
)

# Run Robyn
OutputModels <- robyn_run(
  InputCollect = InputCollect,
  cores = 4,
  iterations = {iterations},
  trials = {trials},
  ts_validation = TRUE,
  add_penalty_factor = FALSE
)

# Select best model
OutputCollect <- robyn_outputs(
  InputCollect = InputCollect,
  OutputModels = OutputModels,
  pareto_fronts = "auto",
  csv_out = "pareto",
  clusters = TRUE,
  export = TRUE,
  plot_folder = robyn_directory,
  plot_pareto = TRUE
)

# Get best model ID from clusters
# Find the pareto_clusters.csv file in the output directory
output_subdirs <- list.dirs(robyn_directory, recursive = FALSE)
robyn_subdir <- output_subdirs[grepl("Robyn_", basename(output_subdirs))][1]
clusters_file <- file.path(robyn_subdir, "pareto_clusters.csv")

if (file.exists(clusters_file)) {{
  clusters_df <- read.csv(clusters_file)
  # Get model with top_sol == TRUE, preferring the first one
  top_models <- clusters_df[clusters_df$top_sol == TRUE, ]
  if (nrow(top_models) > 0) {{
    best_model <- top_models$solID[1]
  }} else {{
    best_model <- clusters_df$solID[1]
  }}
  cat(sprintf("Best model selected from clusters: %s\\n", best_model))
}} else {{
  # Fallback to selectID
  best_model <- OutputCollect$selectID
  if (is.null(best_model) || length(best_model) == 0) {{
    # Last resort: use first solID from xDecompAgg
    best_model <- unique(OutputCollect$xDecompAgg$solID)[1]
  }}
  cat(sprintf("Best model selected: %s\\n", best_model))
}}

# Export decomposition
decomp <- OutputCollect$xDecompAgg[OutputCollect$xDecompAgg$solID == best_model, ]
if (nrow(decomp) > 0) {{
  write.csv(decomp, file.path(robyn_directory, "decomposition.csv"), row.names = FALSE)
}} else {{
  cat("Warning: Could not extract decomposition for best model\\n")
  # Write all unique decomposition data instead
  write.csv(OutputCollect$xDecompAgg, file.path(robyn_directory, "decomposition.csv"), row.names = FALSE)
}}

# Export response curves data
response_data <- list()
for (media in media_spend_cols) {{
  tryCatch({{
    resp <- robyn_response(
      InputCollect = InputCollect,
      OutputCollect = OutputCollect,
      select_model = best_model,
      media_metric = media,
      metric_value = seq(0, max(data[[media]]) * 1.5, length.out = 100)
    )
    response_data[[media]] <- data.frame(
      channel = media,
      spend = resp$metric_value,
      response = resp$response
    )
  }}, error = function(e) {{
    cat(sprintf("Warning: Could not generate response curve for %s: %s\\n", media, e$message))
  }})
}}
if (length(response_data) > 0) {{
  response_df <- do.call(rbind, response_data)
  write.csv(response_df, file.path(robyn_directory, "response_curves.csv"), row.names = FALSE)
}}

# Export model metrics from clusters CSV
if (file.exists(clusters_file)) {{
  best_row <- clusters_df[clusters_df$solID == best_model, ]
  if (nrow(best_row) > 0) {{
    metrics <- data.frame(
      r_squared = 1 - best_row$nrmse_train[1]^2,  # Approximate R² from NRMSE
      nrmse = best_row$nrmse[1],
      mape = best_row$mape[1]
    )
    write.csv(metrics, file.path(robyn_directory, "metrics.csv"), row.names = FALSE)
  }}
}} else {{
  cat("Warning: Could not find clusters file for metrics extraction\\n")
}}

# Run budget allocator
tryCatch({{
  AllocatorCollect <- robyn_allocator(
    InputCollect = InputCollect,
    OutputCollect = OutputCollect,
    select_model = best_model,
    scenario = "max_response_expected_spend",
    channel_constr_low = rep(0.5, length(media_spend_cols)),
    channel_constr_up = rep(1.5, length(media_spend_cols)),
    export = TRUE,
    plot_folder = robyn_directory
  )

  # Export allocation results
  allocation <- AllocatorCollect$dt_optimOut
  write.csv(allocation, file.path(robyn_directory, "budget_allocation.csv"), row.names = FALSE)
}}, error = function(e) {{
  cat(sprintf("Warning: Budget allocation failed: %s\\n", e$message))
}})

# Save model object (use robyn_write for newer versions)
tryCatch({{
  robyn_write(
    InputCollect = InputCollect,
    OutputCollect = OutputCollect,
    select_model = best_model,
    dir = robyn_directory
  )
}}, error = function(e) {{
  cat(sprintf("Warning: Could not save model object: %s\\n", e$message))
}})

# Write completion marker
writeLines("complete", file.path(robyn_directory, "status.txt"))
cat("Robyn model completed successfully!\\n")
'''
        return script

    def _parse_results(self, output_dir: str) -> Dict[str, Any]:
        """Parse Robyn output files into structured results."""
        results = {
            "plots_dir": output_dir,
            "plots_available": [],
            "raw_results": {},
            "metrics": None,
            "channel_contributions": [],
            "response_curves": [],
            "optimal_budget": []
        }

        # Scan for generated plot files (check both main dir and Robyn subdirectory)
        dirs_to_scan = [output_dir]
        for subdir in os.listdir(output_dir):
            subdir_path = os.path.join(output_dir, subdir)
            if os.path.isdir(subdir_path) and subdir.startswith("Robyn_"):
                dirs_to_scan.append(subdir_path)

        for scan_dir in dirs_to_scan:
            for filename in os.listdir(scan_dir):
                if filename.endswith('.png'):
                    plot_name = filename[:-4]
                    results["plots_available"].append({
                        "name": plot_name,
                        "filename": filename,
                        "path": os.path.join(scan_dir, filename)
                    })

        # Check completion status
        status_file = os.path.join(output_dir, "status.txt")
        if not os.path.exists(status_file):
            raise Exception("Model did not complete successfully")

        # Parse metrics
        metrics_file = os.path.join(output_dir, "metrics.csv")
        if os.path.exists(metrics_file):
            metrics_df = pd.read_csv(metrics_file)
            if len(metrics_df) > 0:
                results["metrics"] = {
                    "r_squared": float(metrics_df["r_squared"].iloc[0]),
                    "nrmse": float(metrics_df["nrmse"].iloc[0]),
                    "mape": float(metrics_df["mape"].iloc[0])
                }

        # Parse channel contributions (decomposition)
        decomp_file = os.path.join(output_dir, "decomposition.csv")
        if os.path.exists(decomp_file):
            decomp_df = pd.read_csv(decomp_file)

            # Filter to only media channels (not intercept)
            # Channels can have "spend" in name OR end with "_S" suffix
            media_rows = decomp_df[
                (decomp_df["rn"].str.contains("spend", case=False, na=False)) |
                (decomp_df["rn"].str.endswith("_S", na=False))
            ]

            total_media_effect = media_rows["xDecompAgg"].sum()

            for _, row in media_rows.iterrows():
                contribution = float(row["xDecompAgg"])
                spend = float(row.get("total_spend", 0))
                # Use ROI from Robyn if available, otherwise calculate
                roi = float(row.get("roi_total", row.get("roi_mean", 0)))
                if roi == 0 and spend > 0:
                    roi = contribution / spend

                results["channel_contributions"].append({
                    "channel": row["rn"],
                    "contribution": contribution,
                    "percentage": float(row.get("xDecompPerc", 0)) * 100,
                    "roi": roi,
                    "spend": spend,
                    "effect_share": float(row.get("effect_share", 0)) * 100,
                    "spend_share": float(row.get("spend_share", 0)) * 100,
                    "carryover_pct": float(row.get("carryover_pct", 0)) * 100 if pd.notna(row.get("carryover_pct")) else 0,
                    "ci_low": float(row.get("ci_low", 0)) if pd.notna(row.get("ci_low")) else None,
                    "ci_up": float(row.get("ci_up", 0)) if pd.notna(row.get("ci_up")) else None
                })

        # Parse response curves
        response_file = os.path.join(output_dir, "response_curves.csv")
        if os.path.exists(response_file):
            response_df = pd.read_csv(response_file)
            for channel in response_df["channel"].unique():
                channel_data = response_df[response_df["channel"] == channel]
                results["response_curves"].append({
                    "channel": channel,
                    "spend_values": channel_data["spend"].tolist(),
                    "response_values": channel_data["response"].tolist(),
                    "current_spend": float(channel_data["spend"].median()),
                    "optimal_spend": float(channel_data["spend"].iloc[-1] * 0.8)  # Placeholder
                })

        # Parse budget allocation
        allocation_file = os.path.join(output_dir, "budget_allocation.csv")
        if os.path.exists(allocation_file):
            alloc_df = pd.read_csv(allocation_file)
            for _, row in alloc_df.iterrows():
                if "channels" in alloc_df.columns or "channel" in alloc_df.columns:
                    channel_col = "channels" if "channels" in alloc_df.columns else "channel"
                    current = float(row.get("initSpendUnit", row.get("initial_spend", 0)))
                    optimal = float(row.get("optmSpendUnit", row.get("optimal_spend", current)))

                    results["optimal_budget"].append({
                        "channel": row[channel_col],
                        "current_spend": current,
                        "optimal_spend": optimal,
                        "change_percentage": ((optimal - current) / current * 100) if current > 0 else 0,
                        "expected_revenue_change": float(row.get("optmResponseUnit", 0)) - float(row.get("initResponseUnit", 0))
                    })

        return results

    def optimize_budget(
        self,
        model_results: Dict[str, Any],
        total_budget: float,
        constraints: Optional[Dict[str, Dict[str, float]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Re-run budget optimization with a new total budget.

        This is a simplified version that scales the optimal allocation
        proportionally. For full re-optimization, would need to reload
        the Robyn model and run robyn_allocator again.
        """
        current_budget = sum(
            item.get("current_spend", 0)
            for item in model_results.get("optimal_budget", [])
        )

        if current_budget == 0:
            # Fallback: equal distribution
            channels = [item["channel"] for item in model_results.get("optimal_budget", [])]
            per_channel = total_budget / len(channels) if channels else 0
            return [
                {
                    "channel": ch,
                    "current_spend": 0,
                    "optimal_spend": per_channel,
                    "change_percentage": 100,
                    "expected_revenue_change": 0
                }
                for ch in channels
            ]

        scale_factor = total_budget / current_budget

        optimized = []
        for item in model_results.get("optimal_budget", []):
            channel = item["channel"]
            optimal = item.get("optimal_spend", item.get("current_spend", 0)) * scale_factor

            # Apply constraints if provided
            if constraints and channel in constraints:
                if "min" in constraints[channel]:
                    optimal = max(optimal, constraints[channel]["min"])
                if "max" in constraints[channel]:
                    optimal = min(optimal, constraints[channel]["max"])

            optimized.append({
                "channel": channel,
                "current_spend": item.get("current_spend", 0),
                "optimal_spend": optimal,
                "change_percentage": ((optimal - item.get("current_spend", 0)) / item.get("current_spend", 1)) * 100,
                "expected_revenue_change": item.get("expected_revenue_change", 0) * scale_factor
            })

        return optimized


class RobynSimulatedData:
    """Generate simulated data for testing using Robyn's built-in dataset."""

    @staticmethod
    def generate(output_path: str) -> str:
        """Generate and save simulated weekly data."""
        r_script = f'''
library(Robyn)

# Get simulated data
data(dt_simulated_weekly)

# Save to CSV
write.csv(dt_simulated_weekly, "{output_path}", row.names = FALSE)
cat("Simulated data saved to {output_path}\\n")
'''
        with tempfile.NamedTemporaryFile(mode='w', suffix='.R', delete=False) as f:
            f.write(r_script)
            script_path = f.name

        try:
            result = subprocess.run(
                ["Rscript", script_path],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise Exception(f"Failed to generate simulated data: {result.stderr}")
        finally:
            os.unlink(script_path)

        return output_path
