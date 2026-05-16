/**
 * OrderAI Backend - Google Apps Script (GAS)
 * 
 * This script runs in Google Apps Script associated with a Google Sheet.
 * It provides two endpoints:
 * 1. doPost(e): Authenticates, calls OpenAI API to parse "Raw Note" into structured orders, and appends them to the Sheet.
 * 2. doGet(e): Authenticates and returns all orders as a JSON array for the frontend dashboard.
 * 
 * Setup Instructions:
 * 1. Create a Google Sheet. Rename the active tab to "Orders".
 * 2. Set the header row (Row 1) exactly as:
 *    Timestamp | Customer Name | Item Name | Quantity | Price Unit | Total Price | Raw Note
 * 3. Go to Extensions > Apps Script.
 * 4. Paste this code into the code editor (e.g., Code.gs).
 * 5. Open Project Settings (gear icon) and add the following Script Properties:
 *    - OPENAI_API_KEY: Your OpenAI API key.
 *    - APP_PASSWORD: The secure password you will use to log in to the PWA.
 * 6. Click "Deploy" > "New deployment" > Select type: "Web app".
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Copy the Web App URL and paste it in your PWA Settings.
 */

const SHEET_NAME = "Orders";

/**
 * Handle incoming POST requests (Saving new orders)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty or invalid payload" });
    }

    const payload = JSON.parse(e.postData.contents);
    const password = payload.password;
    const note = payload.note;

    // Validate Authentication
    const scriptProperties = PropertiesService.getScriptProperties();
    const appPassword = scriptProperties.getProperty("APP_PASSWORD");

    if (!appPassword) {
      return jsonResponse({ success: false, error: "Server Configuration Error: APP_PASSWORD is not set" });
    }

    if (password !== appPassword) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid password" });
    }

    if (!note || !note.trim()) {
      return jsonResponse({ success: false, error: "Bad Request: Empty note" });
    }

    const apiKey = scriptProperties.getProperty("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ success: false, error: "Server Configuration Error: OPENAI_API_KEY is not set" });
    }

    // Call OpenAI to parse the natural language note
    const parsedOrders = parseNoteWithOpenAI(note, apiKey);

    // Save to Google Sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: `Sheet tab named "${SHEET_NAME}" not found` });
    }

    const timestamp = new Date();
    parsedOrders.forEach(order => {
      const quantity = parseInt(order.quantity, 10) || 1;
      const priceUnit = parseInt(order.price_unit, 10) || 0;
      const totalPrice = quantity * priceUnit;
      const customer = order.customer && order.customer.toLowerCase() !== "regular" ? order.customer : "Regular";

      sheet.appendRow([
        timestamp,
        customer,
        order.item || "Unknown Item",
        quantity,
        priceUnit,
        totalPrice,
        note
      ]);
    });

    return jsonResponse({ success: true, count: parsedOrders.length, data: parsedOrders });
  } catch (err) {
    return jsonResponse({ success: false, error: `Internal Error: ${err.message}` });
  }
}

/**
 * Handle incoming GET requests (Fetching dashboard data)
 */
function doGet(e) {
  try {
    const password = e.parameter.password;
    const scriptProperties = PropertiesService.getScriptProperties();
    const appPassword = scriptProperties.getProperty("APP_PASSWORD");

    if (!appPassword) {
      return jsonResponse({ success: false, error: "Server Configuration Error: APP_PASSWORD is not set" });
    }

    if (password !== appPassword) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid password" });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ success: false, error: `Sheet tab named "${SHEET_NAME}" not found` });
    }

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return jsonResponse({ success: true, data: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const orders = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Map headers to key friendly strings (e.g. "Customer Name" -> "customer_name")
        const key = header.toString().toLowerCase().trim().replace(/\s+/g, "_");
        let val = row[index];
        
        // Ensure accurate dates and numbers formatting for JSON output
        if (val instanceof Date) {
          val = val.toISOString();
        }
        obj[key] = val;
      });
      return obj;
    });

    return jsonResponse({ success: true, data: orders });
  } catch (err) {
    return jsonResponse({ success: false, error: `Internal Error: ${err.message}` });
  }
}

/**
 * Interface with OpenAI Chat Completions API to parse the note
 * Uses gpt-4o-mini for speed, high accuracy on Vietnamese, and low cost.
 */
function parseNoteWithOpenAI(note, apiKey) {
  const systemPrompt = `You are a professional sales database parser. Parse the sales text into a clean JSON array of objects.
Every object in the array MUST have exactly these keys: "item", "quantity", "price_unit", "customer".

Rules:
1. Currency conversion: convert Vietnamese slang terms like "k", "n", "ngàn", "ng" to 1000 and "tr", "triệu" to 1000000. Example: "20k" -> 20000, "1.5tr" -> 1500000.
2. Price calculations: If a total cost is given for a specific quantity, divide the total cost by the quantity to get the "price_unit".
   Example: "3 banh mi 60k" -> item: "Bánh mì", quantity: 3, price_unit: 20000.
3. Quantity default: If no quantity is specified, default it to 1.
4. Customer field: Extract the name of the buyer/customer if mentioned (e.g., "cho anh Nam", "khách Linh"). If not mentioned or unclear, set "customer" to "Regular".
5. Language: Handle Vietnamese input naturally.
6. Formatting: Output only raw JSON. Never wrap the JSON in Markdown codeblocks (like \`\`\`json) or include extra conversational text. Just output the raw JSON array.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Text to parse: "${note}"` }
    ],
    temperature: 0.1,
    max_tokens: 800
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error(`OpenAI API error (${responseCode}): ${responseText}`);
  }

  const result = JSON.parse(responseText);
  let content = result.choices[0].message.content.trim();

  // Strip Markdown codeblocks if LLM included them accidentally
  if (content.startsWith("```")) {
    content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse AI output as JSON: ${content}`);
  }
}

/**
 * Utility helper to build CORS-enabled, JSON outputs
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
