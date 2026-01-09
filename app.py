from flask import Flask, render_template, request, send_from_directory, redirect, url_for, flash
import os
from dotenv import load_dotenv
import resend
import logging

# Load environment variables
load_dotenv()

# Logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Resend
resend.api_key = os.getenv("RESEND_API_KEY")

# Flask app
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.getenv("SECRET_KEY", "change_this_to_a_long_random_string")

# ==================== ROUTES ====================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/<page>")
def pages(page):
    if page.startswith(("static", "favicon", "robots", "sitemap")) or ".." in page or "/" in page:
        return redirect(url_for("home"))

    template = f"{page}.html"
    if os.path.exists(os.path.join(app.template_folder, template)):
        return render_template(template)

    return render_template("index.html")


@app.route("/downloads/<filename>")
def downloads(filename):
    try:
        return send_from_directory("downloads", filename, as_attachment=True)
    except FileNotFoundError:
        flash("File not found. Please contact us.", "error")
        return redirect(request.referrer or "/")


# ==================== MAIN FORM HANDLER ====================

@app.route("/submit-form", methods=["POST"])
def submit_form():
    # -------- Collect data --------
    form_type = request.form.get("form_type", "General Contact")

    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    phone = request.form.get("phone", "").strip()
    company = request.form.get("company", "").strip()
    message = request.form.get("message", "").strip()

    product = request.form.get("product", "").strip()
    shipment_type = request.form.get("type", "").strip()
    quantity = request.form.get("quantity", "").strip()
    route = request.form.get("route", "").strip()

    stage = request.form.get("stage", "").strip()  # inquiry wizard

    # -------- Validation --------
    errors = []

    if not email or "@" not in email:
        errors.append("Valid email is required.")

    if form_type not in ("Newsletter Subscription",):
        if not name:
            errors.append("Name is required.")

    if not os.getenv("BUSINESS_EMAIL"):
        logger.error("BUSINESS_EMAIL is missing.")
        errors.append("Server configuration error. Please try again later.")

    if errors:
        for err in errors:
            flash(err, "error")
        return redirect(request.referrer or "/")

    # -------- Email body --------
    email_body = f"""
NEW {form_type.upper()} FROM WEBSITE

--- Contact Details ---
Name: {name or 'Not provided'}
Company: {company or 'Not provided'}
Email: {email}
Phone: {phone or 'Not provided'}

--- Inquiry Details ---
Stage: {stage or 'N/A'}
Shipment Type: {shipment_type or 'N/A'}
Product: {product or 'N/A'}
Quantity: {quantity or 'N/A'}
Route: {route or 'N/A'}

Message:
{message or 'No message'}

--- Technical ---
IP: {request.remote_addr}
Page: {request.referrer or 'Direct'}
""".strip()

    # -------- Send Email --------
    try:
        resend.Emails.send({
            "from": "no-reply@globallinklogistics.com",
            "to": os.getenv("BUSINESS_EMAIL"),
            "subject": f"Website {form_type} - {name or 'New Lead'}",
            "text": email_body,
            "reply_to": email
        })
        email_sent = True
    except Exception as e:
        logger.error(f"RESEND ERROR: {e}")
        email_sent = False

    # -------- Flash Message --------
    first_name = name.split()[0] if name else "Visitor"
    msg = f"Thank you, {first_name}! Your request has been received."
    msg += " We'll respond within 24 hours." if email_sent else " Our team will contact you soon."

    flash(msg, "success")
    return redirect(request.referrer or "/")


# ==================== LOCAL DEV ====================
if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1"))
