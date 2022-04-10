module.exports = async (files) => `
<link rel="icon" href="${files['ico']}" sizes="any">
${'svg' in files ? `<link rel="icon" href="${files['svg']}" type="image/svg+xml">
` : ''}<link rel="apple-touch-icon" href="${files['apple']}">
${'manifest' in files ? `<link rel="manifest" href="${files['manifest']}">
` : ''}`;
