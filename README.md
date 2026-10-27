#  PharmTrack: A Smart, Accessible Healthcare Awareness & Assistance System

**PharmTrack** is a full-stack healthcare platform that helps users manage medications safely, affordably, and efficiently.

Built with **Node.js, Express, Python, Flask, Machine Learning, and Supabase**, PharmTrack combines medicine intelligence, emergency healthcare access, prescription management, and automated reminders into a single unified system.


---

## ≡ƒÜÇ Key Highlights

### ≡ƒöì AI-Powered Alternative Medicine Finder

Patients often struggle with expensive branded medicines or unavailable prescriptions.

PharmTrack uses **TF-IDF Vectorization** and **Cosine Similarity Machine Learning** to recommend equivalent medicines based on composition, dosage, and formulation.

**Example**

Crocin ΓåÆ Dolo 650 ΓåÆ Calpol ΓåÆ Other Similar Alternatives

Results are ranked by:

* Clinical similarity
* Chemical composition match
* Cost-effectiveness

---

### ≡ƒÜ¿ Emergency Healthcare Assistance

Designed for critical situations where every second matters.

Features include:

* Live GPS location detection
* Nearby hospital locator
* Nearby pharmacy locator
* Nearby clinic search
* 24├ù7 medical store finder
* One-tap ambulance calling (108)
* Poison control emergency hotline

The interface is optimized with large touch targets and high-contrast accessibility-focused design.

---

### ≡ƒôï Digital Prescription Management

Users can securely upload and manage:

* Prescription Images
* Medical Reports
* PDF Documents

Files are stored in **Supabase Storage**, while metadata is maintained inside **PostgreSQL** for fast retrieval and organization.

---

### ΓÅ░ Smart Medication Reminders

Automated reminder system powered by:

* Email notifications (Resend)
* SMS alerts (Twilio)
* Cron-based scheduling

Users receive reminders for:

* Medicine dosage
* Intake timing
* Daily medication adherence

---

### ≡ƒÆè Medicine QR Verification System

Generate and scan QR codes containing:

* Medicine Name
* Manufacturer
* Batch Information
* Expiry Details
* Additional Notes

Helps users quickly verify medicine information and improve medication safety.

---

### ≡ƒöÉ Secure Authentication

* Google OAuth 2.0
* Session-based authentication
* User activity tracking
* Secure production-ready cookie handling

---

## ≡ƒºá Machine Learning Architecture

The Alternative Medicine Recommendation Engine is the core intelligence layer of PharmTrack.

### Workflow

User Search
Γåô
TF-IDF Vectorization
Γåô
Cosine Similarity Matching
Γåô
Top Similar Medicines Ranked
Γåô
Cheapest Equivalent Suggested

### Why Cosine Similarity?

Unlike simple keyword matching, cosine similarity understands relationships between medicine names and compositions.

This enables accurate recommendations even when:

* Brand names differ
* Queries are partially typed
* Generic and branded names vary

### Performance Optimization

* Dataset loaded once at startup
* Similarity vectors cached in memory
* Millisecond-level recommendation responses
* Python ML service with Node.js fallback engine

---

## ≡ƒÅù∩╕Å System Architecture

Frontend (HTML/CSS/JavaScript)
Γåô
Node.js + Express API Server
Γåô
ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
Γåô Γåô
Flask ML Service Supabase
Γåô Γåô
TF-IDF Engine PostgreSQL + Storage

The architecture separates machine learning workloads from business logic, making the platform scalable and easier to maintain.

---

## ≡ƒ¢á∩╕Å Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript (ES6)

### Backend

* Node.js
* Express.js
* Passport.js
* Multer
* Node-Cron

### Machine Learning

* Python
* Flask
* Scikit-Learn
* NumPy
* TF-IDF Vectorization
* Cosine Similarity

### Database & Storage

* Supabase PostgreSQL
* Supabase Storage

### Notifications

* Resend
* Twilio

### Authentication

* Google OAuth 2.0

---

## ≡ƒôè Real-World Impact

PharmTrack addresses several healthcare challenges:

Γ£à Medication affordability

Γ£à Medicine availability

Γ£à Emergency healthcare accessibility

Γ£à Medication adherence

Γ£à Digital prescription organization

Γ£à Medicine information transparency

---

## ≡ƒîì United Nations SDG Alignment

### SDG 3 ΓÇö Good Health & Well-Being

Promotes safer medication usage and healthcare accessibility.

### SDG 10 ΓÇö Reduced Inequalities

Helps patients discover affordable medicine alternatives.

### SDG 11 ΓÇö Sustainable Communities

Improves access to emergency healthcare resources.

---

## ≡ƒôê Future Enhancements

* AI-powered medicine interaction checker
* OCR prescription digitization
* Voice-assisted medicine search
* Multilingual support
* Predictive medication adherence analytics
* Pharmacy inventory integration
* Mobile application (Android & iOS)

---

## ≡ƒæ¿ΓÇì≡ƒÆ╗ Author

**Saumil Tiwari**

Engineering Student | Full-Stack Developer | Cybersecurity & Healthcare Technology Enthusiast

If you found this project interesting, consider giving it a Γ¡É on GitHub.
