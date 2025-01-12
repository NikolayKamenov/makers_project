const axios = require("axios");

const VERIFY_TOKEN = "test"; 
const GRAPH_TOKEN = "";
const OPENAI_API_KEY = ""; // Replace with your OpenAI API key
const SYSTEM_PROMPT = ""
/**
 * Google Cloud Function to handle Meta Webhook and process WhatsApp messages with ChatGPT.
 */
exports.helloHttp = async (req, res) => {
  if (req.method === "GET") {
    // Handle Webhook Verification
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified!");
      return res.status(200).send(challenge); // Respond with the challenge token
    } else {
      console.log("Verification failed. Tokens do not match.");
      return res.sendStatus(403); // Forbidden if verification fails
    }
  } else if (req.method === "POST") {
    // Handle Incoming Messages
    try {
      const messageEvent = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!messageEvent) {
        console.log("No message found in the request.");
        return res.status(200).send("No message to process.");
      }
      console.log({messageEvent})
      const senderId = messageEvent.from; // WhatsApp user ID
      const threadId = messageEvent.id;
      const messageText = messageEvent.text?.body; // Message text content

      console.log(`Received message from ${senderId}: ${messageText}`);

      // Send the message to ChatGPT
      const chatGptResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: messageText },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      const replyText = chatGptResponse.data.choices[0].message.content;
      console.log(`ChatGPT response: ${replyText}`);

      // Forward the ChatGPT response back to the sender via WhatsApp
      const url =  `https://graph.facebook.com/v21.0/${threadId || ''}/messages`;
      const data = {
      //   recipient_type: "individual",
      //   to: senderId,
      //   type: "text",
      //   text: { body: replyText },
      // };

      // {
        "messaging_product": "whatsapp",
        "to": "",
        "type": "text",
        "text": {
            "body": replyText
        }
    
    }

      
      const headers = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GRAPH_TOKEN}`, // Replace with your Facebook Graph API token
        },
      };
      console.log(url, data, headers);
      const whatsappResponse = await axios.post(
        url,
        data,
        headers
      );

      console.log(`Message sent back to WhatsApp: ${whatsappResponse.status}`);
      return res.status(200).send("Message processed.");
    } catch (error) {
      console.error("Error processing the message:", error.message, error.response?.data);
      return res.status(500).send("Error processing the message.");
    }
  } else {
    console.log("Unsupported method.");
    return res.sendStatus(405); // Method Not Allowed
  }
};