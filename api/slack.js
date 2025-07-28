export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Slack URL verification for Interactivity setup
  if (req.body?.type === "url_verification") {
    return res.status(200).send(req.body.challenge);
  }

  // Parse the payload
  const payload = req.body.payload ? JSON.parse(req.body.payload) : req.body;

  // Handle slash command
  if (payload.command === "/pulse") {
    const modalView = {
      trigger_id: payload.trigger_id,
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
    };

    const slackResponse = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(modalView)
    });

    return res.status(200).send(""); // respond quickly to slash command
  }

  // Handle modal submission
  if (payload.type === "view_submission" && payload.callback_id === "teampulse_response") {
    const user = payload.user.username || payload.user.id;
    const value = payload.view.state.values.score_block.score_selection.selected_option.value;
    const timestamp = new Date().toISOString();

    // Send to Google Apps Script Web App
    await fetch(process.env.GS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp, user, value }),
    });

    return res.status(200).json({ response_action: "clear" }); // close modal
  }

  return res.status(200).send("No action taken");
}
