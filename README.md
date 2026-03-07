# PharmaTrack

PharmaTrack is a web-based application designed to enhance the accessibility, safety, and traceability of pharmaceutical products. It features QR code generation, user authentication, and informative pages about product safety and sustainable development goals.

## Features
- **QR Code Generator:** Easily generate QR codes for pharmaceutical products.
- **User Authentication:** Secure login for administrators and users.
- **Accessibility:** Dedicated page for accessibility features.
- **Safety Information:** Information on product safety and reporting problems.
- **SDG Awareness:** Details on how the project aligns with Sustainable Development Goals.

## Project Structure
```
pharmatrack/
├── auth.html                # User authentication page
├── index.html               # Main landing page
├── qr-generator.html        # QR code generator
├── server.js                # Backend server (Node.js)
├── users.json               # User data storage
├── css/
│   └── base.css             # Base styles
├── images/                  # Image assets
├── js/
│   └── main.js              # Main JavaScript logic
└── pages/
    ├── accessibility.html   # Accessibility info
    ├── admin.html           # Admin dashboard
    ├── features.html        # Features overview
    ├── problem.html         # Problem reporting
    ├── safety.html          # Safety information
    └── sdg.html             # SDG information
```

## Getting Started
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the server:**
   ```bash
   node server.js
   ```
3. **Open in browser:**
   Navigate to `http://localhost:3000` (or the port specified in `server.js`).

## Requirements
- Node.js (v14 or higher recommended)
- npm

## License
This project is for educational purposes.
