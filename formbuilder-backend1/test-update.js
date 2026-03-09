const http = require('http');

async function test() {
    // 1. Login
    const loginRes = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    const cookie = loginRes.headers.get('set-cookie');
    console.log('Login status:', loginRes.status);

    // 2. Create Form
    const formPayload = {
        title: "Test Form",
        description: "",
        allowEditResponse: false,
        status: "PUBLISHED",
        rules: [],
        fields: [{ label: "Name", type: "TEXT", options: [], validation: {}, defaultValue: "" }]
    };
    const createRes = await fetch('http://localhost:8080/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify(formPayload)
    });
    const createdForm = await createRes.json();
    console.log('Created Form ID:', createdForm.id, 'Status:', createdForm.status);

    // 3. Update Form
    const updatePayload = { ...formPayload, title: "Test Form 2" };
    const updateRes = await fetch(`http://localhost:8080/api/forms/${createdForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify(updatePayload)
    });
    const updateText = await updateRes.text();
    console.log('Update Status:', updateRes.status);
    console.log('Update Response:', updateText);
}

test().catch(console.error);
