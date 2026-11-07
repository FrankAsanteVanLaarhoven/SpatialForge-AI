mod merkle;
mod signer;

use std::env;
use std::io::{self, Read};
use signer::{AttestationRecord, SovereignEnclaveSigner};

fn print_usage() {
    eprintln!(r#"
SpatialForge Sovereign Cryptographic Enclave v1.0.0
Usage:
  spatialforge-crypto merkle <leaf1> <leaf2> ...
  spatialforge-crypto attest <bundle_hash> <merkle_root> <timestamp>
  spatialforge-crypto verify <attestation_json>
"#);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        print_usage();
        std::process::exit(1);
    }

    match args[1].as_str() {
        "merkle" => {
            let leaves: Vec<String> = args[2..].to_vec();
            let root = merkle::calculate_merkle_root(&leaves);
            println!("{}", root);
        }
        "attest" => {
            if args.len() < 5 {
                eprintln!("Error: attest requires <bundle_hash> <merkle_root> <timestamp>");
                std::process::exit(1);
            }
            let bundle_hash = &args[2];
            let merkle_root = &args[3];
            let timestamp = &args[4];

            let signer = SovereignEnclaveSigner::new_random();
            let attestation = signer.attest_bundle(bundle_hash, merkle_root, timestamp);
            println!("{}", serde_json::to_string_pretty(&attestation).unwrap());
        }
        "verify" => {
            let mut input = String::new();
            if args.len() >= 3 {
                input = args[2].clone();
            } else {
                io::stdin().read_to_string(&mut input).unwrap();
            }

            match serde_json::from_str::<AttestationRecord>(&input) {
                Ok(rec) => {
                    let valid = SovereignEnclaveSigner::verify_attestation(&rec);
                    println!(r#"{{"valid": {}}}"#, valid);
                    if !valid {
                        std::process::exit(2);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to parse attestation JSON: {}", e);
                    std::process::exit(1);
                }
            }
        }
        _ => {
            print_usage();
            std::process::exit(1);
        }
    }
}
