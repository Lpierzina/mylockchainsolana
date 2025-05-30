// Anchor prelude includes commonly used types, macros, and traits
use anchor_lang::prelude::*;

// Declare the program ID. This must match the deployed program address.
declare_id!("CqrVHNKuxk61bwZCpT7Bo7QygrNh94RiVkhcXjZ6vTb");

#[program]
// Define the main program module
pub mod mylockchain_solana {
    use super::*;

    // Entry point for registering a document hash on-chain
    pub fn register(ctx: Context<Register>, document_hash: [u8; 32]) -> Result<()> {
        let record = &mut ctx.accounts.record;

        // Prevent re-registration of the same document hash
        if record.is_initialized {
            return Err(ErrorCode::AlreadyRegistered.into());
        }

        // Set the on-chain state fields for the document registration
        record.document_hash = document_hash;
        record.registrant = *ctx.accounts.registrant.key; // Save the user's wallet pubkey
        record.timestamp = Clock::get()?.unix_timestamp;  // Save the current block timestamp
        record.is_initialized = true;

        Ok(())
    }
}

#[derive(Accounts)]
// This macro links account constraints to the `register()` function above
#[instruction(document_hash: [u8; 32])]
pub struct Register<'info> {
    // This account will store the record and is deterministically derived from the document hash
    #[account(
        init_if_needed,                   // Creates the account if it doesn't already exist
        payer = registrant,              // The registrant pays the rent to create this account
        space = 8 + 32 + 32 + 8 + 1,     // Account size: 8-byte discriminator + fields
        seeds = [b"record", document_hash.as_ref()], // PDA seed ensures uniqueness per document hash
        bump                              // Anchor auto-fills the bump seed
    )]
    pub record: Account<'info, Record>,

    // The person registering the document (must be a signer)
    #[account(mut)]
    pub registrant: Signer<'info>,

    // The system program is required for creating new accounts
    pub system_program: Program<'info, System>,
}

#[account]
// This is the custom account structure to store registered document data
pub struct Record {
    pub document_hash: [u8; 32],     // The unique fingerprint of the document
    pub registrant: Pubkey,          // Who registered it
    pub timestamp: i64,              // When it was registered
    pub is_initialized: bool,        // Simple flag to prevent re-use
}

#[error_code]
// Define custom error codes for better error handling
pub enum ErrorCode {
    #[msg("This document hash has already been registered.")]
    AlreadyRegistered,
}
