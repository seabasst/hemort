import os
from datetime import datetime
from typing import Any
from jinja2 import Template

from config import REPORTS_DIR

# WeasyPrint is optional - requires system libraries (Cairo, GObject)
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False
    HTML = None
    CSS = None


class ReportGenerator:
    """Generate PDF reports from MMM model results."""

    def __init__(self):
        self.output_dir = REPORTS_DIR

    def generate(self, client: Any, model_run: Any) -> str:
        """
        Generate a PDF report for a model run.

        Args:
            client: Client entity
            model_run: ModelRun entity with results

        Returns:
            Path to generated PDF
        """
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError(
                "PDF generation requires WeasyPrint with system libraries. "
                "Install Cairo and GObject, then run: pip install weasyprint"
            )

        html_content = self._render_html(client, model_run)

        # Generate PDF
        pdf_path = os.path.join(
            self.output_dir,
            f"report_{client.id}_{model_run.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        )

        HTML(string=html_content).write_pdf(
            pdf_path,
            stylesheets=[CSS(string=self._get_styles())]
        )

        return pdf_path

    def _render_html(self, client: Any, model_run: Any) -> str:
        """Render HTML template with model results."""
        template = Template(self._get_template())

        # Prepare data
        metrics = model_run.metrics or {}
        contributions = model_run.channel_contributions or []
        optimal_budget = model_run.optimal_budget or []

        # Sort contributions by percentage
        contributions_sorted = sorted(
            contributions,
            key=lambda x: x.get("percentage", 0),
            reverse=True
        )

        return template.render(
            client_name=client.name,
            client_industry=client.industry or "E-commerce",
            currency=client.currency or "SEK",
            run_date=model_run.completed_at.strftime("%Y-%m-%d") if model_run.completed_at else "N/A",
            r_squared=f"{metrics.get('r_squared', 0) * 100:.1f}%",
            nrmse=f"{metrics.get('nrmse', 0):.4f}",
            mape=f"{metrics.get('mape', 0) * 100:.1f}%",
            contributions=contributions_sorted,
            optimal_budget=optimal_budget,
            plots_available=bool(model_run.plots_dir)
        )

    def _get_template(self) -> str:
        """Get HTML template for the report."""
        return '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MMM Report - {{ client_name }}</title>
</head>
<body>
    <header>
        <div class="logo">KIRI MEDIA</div>
        <div class="report-title">Marketing Mix Model Report</div>
    </header>

    <section class="client-info">
        <h1>{{ client_name }}</h1>
        <p class="subtitle">{{ client_industry }} | {{ run_date }}</p>
    </section>

    <section class="metrics">
        <h2>Model Performance</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">{{ r_squared }}</div>
                <div class="metric-label">R² (Variance Explained)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{ nrmse }}</div>
                <div class="metric-label">NRMSE</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{{ mape }}</div>
                <div class="metric-label">MAPE</div>
            </div>
        </div>
    </section>

    <section class="contributions">
        <h2>Channel Contributions</h2>
        <p class="section-desc">Revenue attribution by marketing channel</p>
        <table>
            <thead>
                <tr>
                    <th>Channel</th>
                    <th>Contribution ({{ currency }})</th>
                    <th>Share</th>
                    <th>ROI</th>
                </tr>
            </thead>
            <tbody>
                {% for item in contributions %}
                <tr>
                    <td>{{ item.channel }}</td>
                    <td>{{ "{:,.0f}".format(item.contribution) }}</td>
                    <td>{{ "{:.1f}%".format(item.percentage) }}</td>
                    <td>{{ "{:.2f}x".format(item.roi) }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </section>

    <section class="budget-optimization">
        <h2>Budget Optimization</h2>
        <p class="section-desc">Recommended budget allocation for maximum ROI</p>
        <table>
            <thead>
                <tr>
                    <th>Channel</th>
                    <th>Current ({{ currency }})</th>
                    <th>Optimal ({{ currency }})</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
                {% for item in optimal_budget %}
                <tr>
                    <td>{{ item.channel }}</td>
                    <td>{{ "{:,.0f}".format(item.current_spend) }}</td>
                    <td>{{ "{:,.0f}".format(item.optimal_spend) }}</td>
                    <td class="{% if item.change_percentage > 0 %}positive{% else %}negative{% endif %}">
                        {{ "{:+.1f}%".format(item.change_percentage) }}
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </section>

    <section class="methodology">
        <h2>Methodology</h2>
        <p>
            This Marketing Mix Model was built using Meta's Robyn framework, an open-source
            MMM package that uses gradient-based optimization and time-series decomposition
            to measure the impact of marketing investments on business outcomes.
        </p>
        <p>
            The model accounts for adstock effects (how marketing impact carries over time)
            and saturation effects (diminishing returns at higher spend levels) to provide
            accurate channel-level attribution and budget optimization recommendations.
        </p>
    </section>

    <footer>
        <p>Generated by Kiri Media MMM Platform</p>
        <p>{{ run_date }}</p>
    </footer>
</body>
</html>
'''

    def _get_styles(self) -> str:
        """Get CSS styles for the report."""
        return '''
@page {
    size: A4;
    margin: 2cm;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #111;
    line-height: 1.6;
    font-size: 11pt;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #111;
    padding-bottom: 1rem;
    margin-bottom: 2rem;
}

.logo {
    font-weight: 700;
    font-size: 14pt;
    letter-spacing: 0.1em;
}

.report-title {
    color: #666;
    font-size: 10pt;
}

.client-info {
    margin-bottom: 2rem;
}

.client-info h1 {
    font-size: 24pt;
    margin: 0;
    font-weight: 600;
}

.subtitle {
    color: #666;
    margin-top: 0.5rem;
}

h2 {
    font-size: 14pt;
    font-weight: 600;
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.5rem;
    margin-top: 2rem;
}

.section-desc {
    color: #666;
    font-size: 10pt;
    margin-bottom: 1rem;
}

.metrics-grid {
    display: flex;
    gap: 1.5rem;
    margin: 1rem 0;
}

.metric-card {
    flex: 1;
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    text-align: center;
}

.metric-value {
    font-size: 24pt;
    font-weight: 600;
    color: #0066FF;
}

.metric-label {
    font-size: 9pt;
    color: #666;
    margin-top: 0.25rem;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    font-size: 10pt;
}

th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
}

th {
    background: #f5f5f5;
    font-weight: 600;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.positive {
    color: #22c55e;
}

.negative {
    color: #ef4444;
}

.methodology {
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 2rem;
    font-size: 10pt;
    color: #444;
}

.methodology h2 {
    border-bottom: none;
    padding-bottom: 0;
}

footer {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    color: #666;
}
'''
