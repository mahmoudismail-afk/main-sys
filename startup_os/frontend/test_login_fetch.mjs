const apiKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';
async function test() {
  const res = await fetch("https://mmumcejifxfszjzjzjjl.supabase.co/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: "mhyo@startupos.com", password: "123456" })
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}

test();
