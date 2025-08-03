export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Handle Slack URL verification
      if (req.headers['content-type'] === 'application/json') {
        const payload = req.body;

        if (payload.type === 'url_verification') {
          return res.status(200).send(payload.challenge);
        }

        if (payload.type === 'view_submission') {
          const user = payload.user.username || payload.user.name || payload.user.id;
          const value = payload.view.state.values.score_block.score_selection.selected_option.value;
          const timestamp = new Date().toISOString();

          // Send to Make.com webhook
          await fetch("https://hook.eu2.make.com/ykabcsya46s2e2u6k859yvhi2e20ouwi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timestamp, user, value }),
          });

          // Close modal
          return res.status(200).json({ response_action: "clear" });
        }

        return res.status(200).json({ ok: true });
      }

      // Handle Slash command
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        const body = new URLSearchParams(await streamToString(req)).entries();
        const params = Object.fromEntries(body);
        const trigger_id = params.trigger_id;

        const modal = {
          trigger_id: trigger_id,
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

        // Call Slack API to open the modal
        const slackRes = await fetch('https://slack.com/api/views.open', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
          },
          body: JSON.stringify(modal)
        });

        const result = await slackRes.json();
        if (!result.ok) {
          console.error("Slack error:", result);
        }

        // Respond quickly to slash command
        return res.status(200).send('');
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Error in Slack handler:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  res.status(405).json({ error: "Method Not Allowed" });
}

// Helper function to read stream (needed for urlencoded body)
async function streamToString(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}
