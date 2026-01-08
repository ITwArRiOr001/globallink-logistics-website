from flask import Flask, render_template, request, send_from_directory, redirect, url_for, flash
import os
from dotenv import load_dotenv
import resend
import logging

# Load environment variables (Render provides them)
load_dotenv()

# Setup logging for Render dashboard
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.getenv("re_UCm8MBib_HtBAa9HHaScWNKPKonDjmaE7")

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.getenv("SECRET_KEY", "change_this_to_a_long_random_string_in_render")

# ==================== Page Routes ====================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/<page>')
def pages(page):
    try:
        return render_template(f'{page}.html')
    except:
        return render_template('index.html')  # Graceful fallback

# ==================== File Downloads ====================
@app.route('/downloads/<filename>')
def downloads(filename):
    try:
        return send_from_directory('downloads', filename, as_attachment=True)
    except FileNotFoundError:
        flash("Requested file not found. Please contact us directly.")
        return redirect(request.referrer or '/')

# ==================== Universal Form Handler ====================
@app.route('/submit-form', methods=['POST'])
def submit_form():
    # Common fields
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()
    phone = request.form.get('phone', '').strip()
    company = request.form.get('company', '').strip()
    message = request.form.get('message', '').strip()

    # Form type & context
    form_type = request.form.get('form_type', 'General Contact')
    product = request.form.get('product', '').strip()
    type_shipment = request.form.get('type', '').strip()  # export/import
    quantity = request.form.get('quantity', '').strip()
    route = request.form.get('route', '').strip()

    # Validation (gentle UX)
    errors = []
    if not name:
        errors.append("Name is required.")
    if not email or '@' not in email:
        errors.append("Valid email is required.")
    if errors:
        for err in errors:
            flash(err, 'error')
        return redirect(request.referrer or '/')

    # Build professional email body
    email_body = f"""
NEW {form_type.upper()} FROM WEBSITE

--- Customer Details ---
Name: {name}
Company: {company or 'Not provided'}
Email: {email}
Phone: {phone or 'Not provided'}

--- Inquiry Details ---
Type: {form_type}
Shipment: {type_shipment or 'N/A'}
Product: {product or 'N/A'}
Quantity/Volume: {quantity or 'N/A'}
Route: {route or 'N/A'}

Message:
{message or 'No additional message'}

--- Technical Info ---
IP: {request.remote_addr}
Page: {request.referrer or 'Direct'}
    """.strip()

    email_subject = f"Website {form_type} - {name}"

    # Send email
    email_sent = False
    try:
        resend.Emails.send({
            "from": "no-reply@globallinklogistics.com",
            "to": os.getenv("BUSINESS_EMAIL"),
            "subject": email_subject,
            "text": email_body,
            "reply_to": email  # Easy reply to customer
        })
        email_sent = True
        logger.info(f"Email sent: {email_subject}")
    except Exception as e:
        logger.error(f"Email failed: {str(e)}")

    # Personalized success message (empathy + trust)
    first_name = name.split()[0] if name else "Visitor"
    success_msg = f"Thank you, {first_name}!"
    if company:
        success_msg += f" ({company})"
    success_msg += " Your request has been received successfully."
    if email_sent:
        success_msg += " We’ve sent a confirmation and will reply within 24 hours."
    else:
        success_msg += " Our team will contact you shortly."

    flash(success_msg, 'success')
    return redirect(request.referrer or '/')

# ==================== Run App ====================
if __name__ == '__main__':
    app.run(debug=True)
