const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
app.use(express.json());

// Serve static files (HTML, CSS, JS, images)
app.use(express.static('.'));

// Route for root - redirect to ACA page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'aca.html'));
});

// Route for ACA page
app.get('/aca', (req, res) => {
    res.sendFile(path.join(__dirname, 'aca.html'));
});

// Route for Final Expense page
app.get('/fe', (req, res) => {
    res.sendFile(path.join(__dirname, 'fe.html'));
});

// Load credentials from environment variables
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Replace escaped newlines
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

// Define the API route for form submissions
app.post('/submit-lead', async (req, res) => {
    try {
        console.log('Form submission received:', req.body);
        
        // Check if Google Sheets credentials are available
        if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEETS_ID) {
            console.log('Google Sheets credentials not configured, logging data instead');
            console.log('Lead data:', JSON.stringify(req.body, null, 2));
            return res.status(200).send({ 
                message: 'Success - Data logged (Google Sheets not configured)',
                data: req.body 
            });
        }

        const auth = new google.auth.JWT({
            email: GOOGLE_CLIENT_EMAIL,
            key: GOOGLE_PRIVATE_KEY,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Extract form data from the request body
        const {
            firstName,
            lastName,
            phone,
            email,
            consentGiven,
            xxTrustedFormCertUrl,
            timestamp,
            campaign,
            estimatedSubsidy,
            zipCode,
            income,
            householdSize,
            ages
        } = req.body;

        // Create the row data in the correct order for your Google Sheet
        const rowData = [
            firstName,
            lastName,
            phone,
            email,
            consentGiven ? 'Yes' : 'No', // Convert boolean to string for the sheet
            xxTrustedFormCertUrl,
            timestamp,
            campaign,
            estimatedSubsidy,
            zipCode,
            income,
            householdSize,
            ages
        ];

        // Append the data to the Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: 'Sheet1!A:Z', // Assumes your data starts at A1 on a sheet named 'Sheet1'
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowData],
            },
        });

        console.log('Successfully wrote data to Google Sheet.');
        res.status(200).send({ message: 'Success' });

    } catch (error) {
        console.error('Error writing to Google Sheet:', error);
        // Still return success to user, but log the error
        res.status(200).send({ 
            message: 'Success - Data received (Google Sheets error logged)',
            error: error.message 
        });
    }
});

// Fallback endpoint for any other form submissions
app.post('/api/leads', async (req, res) => {
    console.log('Alternative form submission received:', req.body);
    res.status(200).send({ message: 'Success - Data received' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
