use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct AttestationRecord {
    pub bundle_hash: String,
    pub merkle_root: String,
    pub timestamp_utc: String,
    pub public_key_hex: String,
    pub signature_hex: String,
}

pub struct SovereignEnclaveSigner {
    signing_key: SigningKey,
}

impl SovereignEnclaveSigner {
    /// Generates a new cryptographically secure keypair using OS entropy
    pub fn new_random() -> Self {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        Self { signing_key }
    }

    /// Loads signer from 32-byte secret seed
    pub fn from_bytes(bytes: &[u8; 32]) -> Self {
        let signing_key = SigningKey::from_bytes(bytes);
        Self { signing_key }
    }

    pub fn public_key_hex(&self) -> String {
        hex::encode(self.signing_key.verifying_key().as_bytes())
    }

    /// Cryptographically signs an evidence bundle hash and returns full attestation record
    pub fn attest_bundle(&self, bundle_hash: &str, merkle_root: &str, timestamp_utc: &str) -> AttestationRecord {
        let message = format!("{}:{}:{}", bundle_hash, merkle_root, timestamp_utc);
        let signature: Signature = self.signing_key.sign(message.as_bytes());

        AttestationRecord {
            bundle_hash: bundle_hash.to_string(),
            merkle_root: merkle_root.to_string(),
            timestamp_utc: timestamp_utc.to_string(),
            public_key_hex: self.public_key_hex(),
            signature_hex: hex::encode(signature.to_bytes()),
        }
    }

    /// Verifies any attestation record against its embedded public key
    pub fn verify_attestation(record: &AttestationRecord) -> bool {
        let pubkey_bytes = match hex::decode(&record.public_key_hex) {
            Ok(b) if b.len() == 32 => {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&b);
                arr
            }
            _ => return false,
        };

        let sig_bytes = match hex::decode(&record.signature_hex) {
            Ok(b) if b.len() == 64 => {
                let mut arr = [0u8; 64];
                arr.copy_from_slice(&b);
                arr
            }
            _ => return false,
        };

        let verifying_key = match VerifyingKey::from_bytes(&pubkey_bytes) {
            Ok(vk) => vk,
            Err(_) => return false,
        };

        let signature = Signature::from_bytes(&sig_bytes);
        let message = format!("{}:{}:{}", record.bundle_hash, record.merkle_root, record.timestamp_utc);

        verifying_key.verify(message.as_bytes(), &signature).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signing_and_verification() {
        let signer = SovereignEnclaveSigner::new_random();
        let attestation = signer.attest_bundle(
            "bf6a433c0b75c9930edb20834f1bd1442947d250edcf2657b0a4e5f025ccaa9b",
            "7f8303f7b8fd1fc558d81de34213d...e887f1",
            "2026-11-07T14:05:05Z",
        );

        assert!(SovereignEnclaveSigner::verify_attestation(&attestation));

        // Tamper test: modify bundle hash
        let mut tampered = attestation;
        tampered.bundle_hash = "0000000000000000000000000000000000000000000000000000000000000000".to_string();
        assert!(!SovereignEnclaveSigner::verify_attestation(&tampered));
    }
}
