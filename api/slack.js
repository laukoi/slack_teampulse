export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const contentType = req.headers['content-type'];

    // Slash command
    if (contentType === 'application/x-www-form-urlencoded') {
      const bodyText = await getRawBody(req);
      const params = new URLSearchParams(bodyText.toString());
      const trigger_id = params.get('trigger_id');

      // Send modal async (do not wait)
      fetch('https://slack.com/api/views.open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
          trigger_id,
          view: {
            type: "modal",
            callback_id: "teampulse_response",
            title: { type: "plain_text", text: "TeamPulse" },
            submit: { type: "plain_text", text: "Submit" },
            close: { type: "plain_text", text: "Cancel" },
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "*How much do you agree with this statement?*\n\n_\"I felt safe to speak up or disagree, even with leads or founders.\"_"
                }
              },
              {
                type: "input",
                block_id: "score_block",
                label: { type: "plain_text", text: "Your answer" },
                element: {
                  type: "static_select",
                  action_id: "score_selection",
                  placeholder: { type: "plain_text", text: "Select a score" },
                  options: [
                    { text: { type: "plain_text", text: "1 – Strongly disagree" }, value: "1" },
                    { text: { type: "plain_text", text: "2 – Disagree" }, value: "2" },
                    { text: { type: "plain_text", text: "3 – Neutral" }, value: "3" },
                    { text: { type: "plain_text", text: "4 – Agree" }, value: "4" },
                    { text: { type: "plain_text", text: "5 – Strongly agree" }, value: "5" }
                  ]
                }
              }
            ]
          }
        })
      }).catch(err => console.error("Slack modal error:", err));

      // Respond immediately to Slack
      return res.status(200).send('');
    }

    // Interactivity (modal submission)
    if (contentType === 'application/json') {
      const payload = req.body;

      if (payload?.type === 'view_submission') {
        const user = payload.user.id;
        const value = payload.view.state.values.score_block.score_selection.selected_option.value;
        const timestamp = new Date().toISOString();

        // Send to Google Sheet or Make.com webhook here
        // ...

        return res.status(200).json({ response_action: "clear" });
      }

      return res.status(200).send('Unhandled payload');
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).send("Internal Server Error");
  }
}

// Helper to read raw body from request stream
import { Readable } from 'stream';
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
