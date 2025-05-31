const { Keypair, Connection, PublicKey, SystemProgram } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const nodemailer = require("nodemailer");
const express = require("express");

const app = express();
app.use(express.json());

const programId = new PublicKey(process.env.SOLANA_PROGRAM_ID);
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.SOLANA_KEYPAIR_PATH, "utf-8")))
);
const connection = new Connection(process.env.SOLANA_MAINNET_RPC);
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {});
const idl = require("./target/idl/mylockchain_solana.json");
const program = new anchor.Program(idl, programId, provider);

app.post("/solanaSubmitDocument", async (req, res) => {
  try {
    const { documentHash } = req.body;
    if (!documentHash || !documentHash.startsWith("0x")) {
      throw new Error("Invalid or missing documentHash");
    }

    const hashBytes = Uint8Array.from(Buffer.from(documentHash.slice(2), "hex"));
    if (hashBytes.length !== 32) throw new Error("Hash must be 32 bytes");

    const [recordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("record"), hashBytes],
      programId
    );

    const txSig = await program.methods
      .register(Array.from(hashBytes))
      .accounts({
        record: recordPda,
        registrant: keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();

    console.log("✅ Registered hash:", documentHash, "TX:", txSig);
    res.json({ success: true, transactionHash: txSig });
  } catch (err) {
    console.error("/solanaSubmitDocument error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/checkRegistration", async (req, res) => {
  try {
    const { hashHex } = req.body;
    if (!hashHex || typeof hashHex !== "string" || !hashHex.startsWith("0x")) {
      throw new Error("Invalid or missing hashHex");
    }

    const hashBytes = Uint8Array.from(Buffer.from(hashHex.slice(2), "hex"));
    if (hashBytes.length !== 32) throw new Error("Hash must be 32 bytes");

    const [recordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("record"), hashBytes],
      programId
    );

    let isRegistered = false;
    try {
      const record = await program.account.record.fetch(recordPda);
      isRegistered = record?.isInitialized ?? false;
    } catch (e) {
      isRegistered = false;
    }

    res.json({ isRegistered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/getDetails", async (req, res) => {
  try {
    const { hashHex } = req.body;
    if (!hashHex || typeof hashHex !== "string" || !hashHex.startsWith("0x")) {
      throw new Error("Invalid or missing hashHex");
    }

    const hashBytes = Uint8Array.from(Buffer.from(hashHex.slice(2), "hex"));
    if (hashBytes.length !== 32) throw new Error("Hash must be 32 bytes");

    const [recordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("record"), hashBytes],
      programId
    );

    const record = await program.account.record.fetch(recordPda);
    if (!record?.isInitialized) {
      return res.status(404).json({ error: "Document not registered on Solana." });
    }

    res.json({
      registrant: record.registrant.toBase58(),
      timestamp: record.timestamp.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 MyLockChain Solana API running on port ${process.env.PORT || 3000}`);
});


app.post("/sendReceipt", async (req, res) => {
  try {
    const {
      email,
      fileName,
      ipfsHash,
      hashHex,
      txHash,
      registrant,
      timestamp,
      contractAddress, // (optional override)
    } = req.body;

    if (!email || !fileName || !ipfsHash || !hashHex || !txHash || !registrant || !timestamp) {
      throw new Error("Missing required receipt fields.");
    }

    const readableTime = new Date(Number(timestamp) * 1000).toLocaleString();
    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const contractUrl = `https://solscan.io/account/${contractAddress || process.env.SOLANA_PROGRAM_ID}`;
    const transactionUrl = `https://solscan.io/tx/${txHash}`;

    const htmlBody = `
      <h2>📄 Your MyLockChain Solana Registration Receipt</h2>

      <p><strong>📁 File Name:</strong> ${fileName}<br/>
      <em>The original title you uploaded — now registered on-chain.</em></p>

      <p><strong>📦 IPFS CID:</strong> ${ipfsHash}<br/>
      <em>Permanent fingerprint for your document in the decentralized web.</em></p>

      <p><strong>🔗 Retrieve Link:</strong> <a href="${ipfsLink}" target="_blank">${ipfsLink}</a></p>

      <p><strong>🧬 Document Hash (Hex):</strong> ${hashHex}</p>
      
      <p><strong>👤 Registered By:</strong> ${registrant}</p>
      <p><strong>🕰️ Timestamp:</strong> ${readableTime}</p>

      <p><strong>💾 Contract:</strong> <a href="${contractUrl}" target="_blank">${contractUrl}</a></p>
      <p><strong>🚀 Transaction:</strong> <a href="${transactionUrl}" target="_blank">${txHash}</a></p>

      <p><em>💡 This receipt confirms your document hash has been immutably recorded on the Solana blockchain via MyLockChain.io</em></p>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `✅ MyLockChain Receipt: ${fileName}`,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Solana /sendReceipt error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


console.log("✅ Loaded all Solana routes. Server about to start...");
app.listen(PORT, () => {
  console.log(`🚀 MyLockChain Solana API live on port ${PORT}`);
});
