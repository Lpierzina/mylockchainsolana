window.handlePostUploadSubmission = async function ({ hashHex, ipfsHash, fileName }) {
  try {
    const programId = "YOUR_MAINNET_PROGRAM_ID";
    const contractExplorerUrl = `https://solscan.io/account/${programId}`;
    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    const solanaRes = await fetch("https://your-heroku-server.com/solanaSubmitDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashHex, ipfsHash, fileName }),
    });

    const { transactionHash } = await solanaRes.json();
    const txLink = `https://solscan.io/tx/${transactionHash}`;

    const receiptEl = document.getElementById("receipt");
    const contentEl = document.getElementById("receiptContent");
    const qrCodeEl = document.getElementById("qrCode");

    contentEl.innerHTML = `
      <h2>📄 Your MyLockChain Solana Registration Receipt</h2>
      <p><strong>📁 File Name:</strong> ${fileName}</p>
      <p><strong>🧬 Document Hash (Hex):</strong> ${hashHex}</p>
      <p><strong>📦 IPFS CID:</strong> ${ipfsHash}</p>
      <p><strong>🔗 Retrieve:</strong> <a href="${ipfsLink}" target="_blank">${ipfsLink}</a></p>
      <p><strong>🧾 Smart Contract:</strong> <a href="${contractExplorerUrl}" target="_blank">${contractExplorerUrl}</a></p>
      <p><strong>🚀 Transaction:</strong> <a href="${txLink}" target="_blank">${txLink}</a></p>
    `;

    new QRCode(qrCodeEl, ipfsLink);

    receiptEl.style.display = "block";
    receiptEl.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error("❌ Solana submit error:", err);
    alert("Submission failed: " + err.message);
  }
};
