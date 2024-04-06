require("dotenv").config();
import request from "request";

// Example function to check if any page admins are online
async function areAdminsOnline(pageId) {
    const response = await fetch(`https://graph.facebook.com/v12.0/${pageId}/admins?access_token=${process.FB_PAGE_TOKEN}`);
    const admins = await response.json();

    for (const admin of admins.data) {
        const userResponse = await fetch(`https://graph.facebook.com/v12.0/${admin.id}?fields=active&access_token=${process.FB_PAGE_TOKEN}`);
        const userData = await userResponse.json();

        if (userData.active) {
            return true; // At least one admin is online
        }
    }

    return false; // No admins are online
};

// get admin psid
async function getAdminsPSIDs(pageId) {
    const response = await fetch(`https://graph.facebook.com/v12.0/${page - id}/roles?access_token=${process.FB_PAGE_TOKEN}`);
    const admins = await response.json();

    return admins; // No admins are online
};


let postWebhook = (req, res) => {
    // Parse the request body from the POST
    let body = req.body;

    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(async function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log("web hook Event:", webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            const adminsPSIDs = await getAdminsPSIDs(process.env.FB_PAGE_ID);

            console.log("adminsPSIDs", adminsPSIDs)

            //TODO:
            //if page is sending to user, bot deactivate for 5 min for this user
            if (sender_psid === process.env.FB_PAGE_ID) {
                console.log('PAGE ID: ' + sender_psid);
                return;
            }

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }

        });

        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};

let getWebhook = (req, res) => {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.MY_VERIFY_FB_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
};

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { "text": "Thanks!" }
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": { "text": response }
    };

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v7.0/me/messages",
        "qs": { "access_token": process.env.FB_PAGE_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!');
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

function firstTrait(nlp, name) {
    return nlp && nlp.entities && nlp.traits[name] && nlp.traits[name][0];
}

function handleMessage(sender_psid, message) {
    //handle message for react, like press like button
    // id like button: sticker_id 369239263222822

    if (message && message.attachments && message.attachments[0].payload) {
        callSendAPI(sender_psid, "Thank you for using our page !!!");
        callSendAPIWithTemplate(sender_psid);
        return;
    }

    let entitiesArr = ["wit$greetings", "wit$thanks", "wit$bye"];
    let entityChosen = "";
    entitiesArr.forEach((name) => {
        let entity = firstTrait(message.nlp, name);
        if (entity && entity.confidence > 0.8) {
            entityChosen = name;
        }
    });

    if (entityChosen === "") {
        //default
        callSendAPI(sender_psid, `The bot is needed more training, try to say "thanks a lot" or "hi" to the bot`);
    } else {
        if (entityChosen === "wit$greetings") {
            //send greetings message
            callSendAPI(sender_psid, 'Hi there! This bot is a bot!');
        }
        if (entityChosen === "wit$thanks") {
            //send thanks message
            callSendAPI(sender_psid, `You 're welcome!`);
        }
        if (entityChosen === "wit$bye") {
            //send bye message
            callSendAPI(sender_psid, 'bye-bye!');
        }
    }
}

let callSendAPIWithTemplate = (sender_psid) => {
    // document fb message template
    // https://developers.facebook.com/docs/messenger-platform/send-messages/templates
    let body = {
        "recipient": {
            "id": sender_psid
        },
        "message": {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [
                        {
                            "title": "Welcome",
                            "image_url": "https://www.nexmo.com/wp-content/uploads/2018/10/build-bot-messages-api-768x384.png",
                            "subtitle": "Welcomeeeeeeeeeeeeeeeeeee",
                            "buttons": [
                                {
                                    "type": "web_url",
                                    "url": "https://www.youtube.com/watch?v=uYXwxJBt6T4",
                                    "title": "Watch now"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    };

    request({
        "uri": "https://graph.facebook.com/v6.0/me/messages",
        "qs": { "access_token": process.env.FB_PAGE_TOKEN },
        "method": "POST",
        "json": body
    }, (err, res, body) => {
        if (!err) {
            // console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
};

module.exports = {
    postWebhook: postWebhook,
    getWebhook: getWebhook
};