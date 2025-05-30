import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MylockchainSolana } from "../target/types/mylockchain_solana";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as assert from "assert";

describe("mylockchain_solana", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MylockchainSolana as Program<MylockchainSolana>;

  // Sample 32-byte document hash
  const sampleHash = new Uint8Array(32);
  sampleHash.set([1, 2, 3, 4, 5]); // Fill a few values for uniqueness

  // Derive PDA from seed
  let recordPda: PublicKey;
  let bump: number;

  before(async () => {
    [recordPda, bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("record"), sampleHash],
      program.programId
    );
  });

  it("Registers a new document hash", async () => {
    await program.methods
  .register([...sampleHash] as any) // sometimes TS needs a cast here
  .accounts({
    record: recordPda,
    registrant: provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  } as any)
  .rpc();


    console.log("✅ Document hash registered:", recordPda.toBase58());

    const record = await program.account.record.fetch(recordPda);
    assert.ok(record.isInitialized);
    assert.deepStrictEqual(record.documentHash, [...sampleHash]);
    assert.strictEqual(record.registrant.toBase58(), provider.wallet.publicKey.toBase58());
    assert.ok(record.timestamp.toNumber() > 0);
  });

  it("Fails to register the same document hash again", async () => {
    try {
      await program.methods
  .register([...sampleHash] as any) // sometimes TS needs a cast here
  .accounts({
    record: recordPda,
    registrant: provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  } as any)
  .rpc();

      assert.fail("❌ Should have thrown AlreadyRegistered error");
    } catch (err: any) {
      const errMsg = "This document hash has already been registered.";
      assert.ok(err.toString().includes(errMsg));
      console.log("✅ Correctly threw AlreadyRegistered error");
    }
  });
});
