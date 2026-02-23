# Robyn MMM Template Script
# This script is used as a reference and is dynamically generated
# by robyn_runner.py for each model run.

library(Robyn)

# Load configuration from JSON
args <- commandArgs(trailingOnly = TRUE)
config_path <- args[1]

if (is.null(config_path) || !file.exists(config_path)) {
  stop("Config file path required as first argument")
}

config <- jsonlite::fromJSON(config_path)

# Extract configuration
data_path <- config$data_path
output_dir <- config$output_dir
date_column <- config$date_column
revenue_column <- config$revenue_column
spend_columns <- config$spend_columns
control_columns <- config$control_columns

# Load data
data <- read.csv(data_path)
data[[date_column]] <- as.Date(data[[date_column]])

# Verify columns exist
required_cols <- c(date_column, revenue_column, spend_columns)
missing_cols <- setdiff(required_cols, names(data))
if (length(missing_cols) > 0) {
  stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
}

cat("Data loaded successfully\n")
cat(sprintf("Rows: %d, Date range: %s to %s\n",
            nrow(data),
            min(data[[date_column]]),
            max(data[[date_column]])))

# Build hyperparameters first
hyperparameters <- list()

# Default hyperparameter ranges
theta_min <- ifelse(!is.null(config$adstock) && !is.null(config$adstock$theta), config$adstock$theta$min, 0)
theta_max <- ifelse(!is.null(config$adstock) && !is.null(config$adstock$theta), config$adstock$theta$max, 0.9)
alpha_min <- ifelse(!is.null(config$saturation) && !is.null(config$saturation$alpha), config$saturation$alpha$min, 0.5)
alpha_max <- ifelse(!is.null(config$saturation) && !is.null(config$saturation$alpha), config$saturation$alpha$max, 3)
gamma_min <- ifelse(!is.null(config$saturation) && !is.null(config$saturation$gamma), config$saturation$gamma$min, 0.3)
gamma_max <- ifelse(!is.null(config$saturation) && !is.null(config$saturation$gamma), config$saturation$gamma$max, 1)

for (media in spend_columns) {
  hyperparameters[[paste0(media, "_alphas")]] <- c(alpha_min, alpha_max)
  hyperparameters[[paste0(media, "_gammas")]] <- c(gamma_min, gamma_max)
  hyperparameters[[paste0(media, "_thetas")]] <- c(theta_min, theta_max)
}

cat("Hyperparameters configured for channels:", paste(spend_columns, collapse=", "), "\n")

# Create InputCollect without prophet_vars (too few data points for prophet)
InputCollect <- robyn_inputs(
  dt_input = data,
  dt_holidays = dt_prophet_holidays,
  date_var = date_column,
  dep_var = revenue_column,
  dep_var_type = "revenue",
  prophet_country = "SE",
  paid_media_spends = spend_columns,
  paid_media_vars = spend_columns,
  window_start = min(data[[date_column]]),
  window_end = max(data[[date_column]]),
  adstock = "geometric",
  hyperparameters = hyperparameters
)

# Add control variables if specified
if (!is.null(control_columns) && length(control_columns) > 0) {
  InputCollect <- robyn_inputs(
    InputCollect = InputCollect,
    context_vars = control_columns
  )
}

cat("Hyperparameters configured\n")

# Run model
iterations <- ifelse(!is.null(config$iterations), config$iterations, 2000)
trials <- ifelse(!is.null(config$trials), config$trials, 5)

cat(sprintf("Running Robyn with %d iterations and %d trials...\n", iterations, trials))

OutputModels <- robyn_run(
  InputCollect = InputCollect,
  cores = parallel::detectCores() - 1,
  iterations = iterations,
  trials = trials,
  ts_validation = TRUE,
  add_penalty_factor = FALSE
)

# Generate outputs
OutputCollect <- robyn_outputs(
  InputCollect = InputCollect,
  OutputModels = OutputModels,
  pareto_fronts = "auto",
  csv_out = "pareto",
  clusters = TRUE,
  export = TRUE,
  plot_folder = output_dir,
  plot_pareto = TRUE
)

# Get best model
best_model <- OutputCollect$selectID
cat(sprintf("Best model selected: %s\n", best_model))

# Export decomposition
decomp <- OutputCollect$xDecompAgg[OutputCollect$xDecompAgg$solID == best_model, ]
write.csv(decomp, file.path(output_dir, "decomposition.csv"), row.names = FALSE)

# Export metrics
metrics <- data.frame(
  r_squared = OutputCollect$allSolutions$rsq_train[OutputCollect$allSolutions$solID == best_model],
  nrmse = OutputCollect$allSolutions$nrmse[OutputCollect$allSolutions$solID == best_model],
  mape = OutputCollect$allSolutions$mape[OutputCollect$allSolutions$solID == best_model]
)
write.csv(metrics, file.path(output_dir, "metrics.csv"), row.names = FALSE)

# Export response curves
response_data <- list()
for (media in spend_columns) {
  tryCatch({
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
  }, error = function(e) {
    cat(sprintf("Warning: Could not generate response curve for %s: %s\n", media, e$message))
  })
}
if (length(response_data) > 0) {
  response_df <- do.call(rbind, response_data)
  write.csv(response_df, file.path(output_dir, "response_curves.csv"), row.names = FALSE)
}

# Run budget allocator
tryCatch({
  AllocatorCollect <- robyn_allocator(
    InputCollect = InputCollect,
    OutputCollect = OutputCollect,
    select_model = best_model,
    scenario = "max_response_expected_spend",
    channel_constr_low = rep(0.5, length(spend_columns)),
    channel_constr_up = rep(1.5, length(spend_columns)),
    export = TRUE,
    plot_folder = output_dir
  )

  allocation <- AllocatorCollect$dt_optimOut
  write.csv(allocation, file.path(output_dir, "budget_allocation.csv"), row.names = FALSE)
}, error = function(e) {
  cat(sprintf("Warning: Budget allocation failed: %s\n", e$message))
})

# Save model object
robyn_save(
  robyn_object = OutputCollect,
  select_model = best_model,
  InputCollect = InputCollect,
  dir = output_dir
)

# Write completion marker
writeLines("complete", file.path(output_dir, "status.txt"))
cat("Robyn model completed successfully!\n")
