export default async function handler(req, res) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/ykabcsya46s2e2u6k859yvhi2e20ouwi';

  // Respond to Slack verification
  if (req.body.type === 'url_verification') {
    return res.status(200).send(req.body.challenge);
  }

  // Parse payload from Slack
  let payload = req.body;
  if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
    const querystring = require('querystring');
    payload = JSON.parse(querystring.parse(req.body).payload);
  }

  // Slash command: open modal
  if (req.body.command === '/pulse') {
    const modalView = {
      type: 'modal',
      callback_id: 'teampulse_submission',
      title: {
        type: 'plain_text',
        text: 'TeamPulse',
      },
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'q1',
          label: { type: 'plain_text', text: 'How focused was the team today?' },
          element: {
            type: 'static_select',
            action_id: 'score',
            options: [1, 2, 3, 4, 5].map(n => ({
              text: { type: 'plain_text', text: `${n}` },
              value: `${n}`
            }))
          }
        }
        // Add more questions as needed here
      ]
    };

    const result = await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trigger_id: req.body.trigger_id,
        view: modalView
      })
    });

    return res.status(200).end(); // must respond in <3s
  }

  // Modal submission
  if (payload.type === 'view_submission' && payload.view.callback_id === 'teampulse_submission') {
    const user = payload.user.username || payload.user.id;
    const values = payload.view.state.values;

    const parsedAnswers = Object.entries(values).map(([questionId, val]) => {
      const action = Object.values(val)[0];
      return { questionId, answer: action.selected_option.value };
    });

    // Forward answers to Make.com
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user,
        answers: parsedAnswers,
        timestamp: new Date().toISOString()
      })
    });

    return res.status(200).json({ response_action: 'clear' });
  }

  // Default fallback
  return res.status(200).send('No action taken');
}
