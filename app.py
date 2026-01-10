from flask import Flask, render_template, request, send_from_directory, redirect, url_for, flash
import os
from dotenv import load_dotenv
import resend
import logging

# ==================== ENV & LOGGING ====================

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# ==================== RESEND ====================

resend.api_key = os.getenv("RESEND_API_KEY")

# ==================== FLASK APP ====================

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

# ✅ ADD HEALTH CHECK HERE (BEST PLACE)
@app.route("/health")
def health_check():
    return "OK", 200

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
    # ---------- Common Fields ----------
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

    # Inquiry Wizard specific
    stage = request.form.get("stage", "").strip()

    # ---------- Validation ----------
    errors = []

    if not email or "@" not in email:
        errors.append("Valid email is required.")

    if form_type != "Newsletter Subscription" and not name:
        errors.append("Name is required.")

    if not os.getenv("BUSINESS_EMAIL"):
        logger.error("BUSINESS_EMAIL is missing.")
        errors.append("Server configuration error. Please try again later.")

    if errors:
        for err in errors:
            flash(err, "error")
        return redirect(request.referrer or "/")

    # ---------- Email Body ----------
    email_body = f"""
NEW {form_type.upper()} SUBMISSION

--- CONTACT DETAILS ---
Name: {name or 'Not provided'}
Company: {company or 'Not provided'}
Email: {email}
Phone: {phone or 'Not provided'}

--- REQUEST DETAILS ---
Stage: {stage or 'N/A'}
Shipment Type: {shipment_type or 'N/A'}
Product: {product or 'N/A'}
Quantity: {quantity or 'N/A'}
Route: {route or 'N/A'}

Message:
{message or 'No message provided'}

--- TECHNICAL ---
IP: {request.remote_addr}
Page: {request.referrer or 'Direct'}
""".strip()

    # ---------- Send Email ----------
    try:
        resend.Emails.send({
            "from": "Global Link <onboarding@resend.dev>",
            "to": os.getenv("BUSINESS_EMAIL"),
            "subject": f"{form_type} – New Lead",
            "text": email_body,
            "reply_to": email
        })
        email_sent = True
    except Exception as e:
        logger.error(f"RESEND ERROR: {e}")
        email_sent = False

    # ---------- Flash Message ----------
    first_name = name.split()[0] if name else "Visitor"
    success_msg = f"Thank you, {first_name}! Your request has been received."
    success_msg += " We'll respond within 24 hours." if email_sent else " Our team will contact you soon."

    flash(success_msg, "success")
    return redirect(request.referrer or "/")

# ==================== LOCAL DEV ====================

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1"))
