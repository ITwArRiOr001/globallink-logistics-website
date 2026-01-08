from flask import Flask, render_template, request, send_from_directory, redirect, url_for, flash
import os
from dotenv import load_dotenv
import resend
import logging

# Load environment variables from Render
load_dotenv()

# Setup logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Initialize Resend securely from env var
resend.api_key = os.getenv("RESEND_API_KEY")
# Create Flask app – SINGLE LINE with static fix
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.getenv("SECRET_KEY", "change_this_to_a_long_random_string_in_render")

# ==================== Routes ====================

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/<page>')
def pages(page):
    if page.startswith("static"):
        return redirect(url_for('home'))

    try:
        return render_template(f'{page}.html')
    except:
        return render_template('index.html')


@app.route('/downloads/<filename>')
def downloads(filename):
    try:
        return send_from_directory('downloads', filename, as_attachment=True)
    except FileNotFoundError:
        flash("File not found. Please contact us.")
        return redirect(request.referrer or '/')

@app.route('/submit-form', methods=['POST'])
def submit_form():
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()
    phone = request.form.get('phone', '').strip()
    company = request.form.get('company', '').strip()
    message = request.form.get('message', '').strip()
    form_type = request.form.get('form_type', 'General Contact')
    product = request.form.get('product', '').strip()
    type_shipment = request.form.get('type', '').strip()
    quantity = request.form.get('quantity', '').strip()
    route = request.form.get('route', '').strip()

    # Validation
    errors = []
    if not name:
        errors.append("Name is required.")
    if not email or '@' not in email:
        errors.append("Valid email is required.")
    if errors:
        for err in errors:
            flash(err, 'error')
        return redirect(request.referrer or '/')

    # Email body
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
Quantity: {quantity or 'N/A'}
Route: {route or 'N/A'}

Message:
{message or 'No message'}

--- Technical ---
IP: {request.remote_addr}
Page: {request.referrer or 'Direct'}
    """.strip()

    try:
        resend.Emails.send({
            "from": "no-reply@globallinklogistics.com",
            "to": os.getenv("BUSINESS_EMAIL"),
            "subject": f"Website {form_type} - {name}",
            "text": email_body,
            "reply_to": email
        })
        email_sent = True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        email_sent = False

    first_name = name.split()[0] if name else "Visitor"
    success_msg = f"Thank you, {first_name}!"
    if company:
        success_msg += f" ({company})"
    success_msg += " Your request has been received successfully."
    if email_sent:
        success_msg += " We'll reply within 24 hours."
    else:
        success_msg += " Our team will contact you soon."

    flash(success_msg, 'success')
    return redirect(request.referrer or '/')

if __name__ == '__main__':
    app.run(debug=True)
