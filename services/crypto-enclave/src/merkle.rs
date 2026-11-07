use sha2::{Digest, Sha256};

/// Computes the SHA-256 hash of a byte slice formatted as hex
pub fn hash_leaf(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// Computes the parent hash of two child hashes
pub fn hash_pair(left_hex: &str, right_hex: &str) -> String {
    let mut hasher = Sha256::new();
    let left_bytes = hex::decode(left_hex).unwrap_or_default();
    let right_bytes = hex::decode(right_hex).unwrap_or_default();
    hasher.update(&left_bytes);
    hasher.update(&right_bytes);
    hex::encode(hasher.finalize())
}

/// Constructs a Merkle root from a slice of leaf hashes
pub fn calculate_merkle_root(leaves: &[String]) -> String {
    if leaves.is_empty() {
        return hash_leaf(b"EMPTY_MERKLE_TREE");
    }
    if leaves.len() == 1 {
        return leaves[0].clone();
    }

    let mut current_level = leaves.to_vec();
    while current_level.len() > 1 {
        let mut next_level = Vec::new();
        for chunk in current_level.chunks(2) {
            if chunk.len() == 2 {
                next_level.push(hash_pair(&chunk[0], &chunk[1]));
            } else {
                // Odd leaf: duplicate or pair with itself for balanced tree
                next_level.push(hash_pair(&chunk[0], &chunk[0]));
            }
        }
        current_level = next_level;
    }

    current_level[0].clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merkle_root_determinism() {
        let leaves = vec![
            hash_leaf(b"frame_1_ais"),
            hash_leaf(b"frame_2_radar"),
            hash_leaf(b"frame_3_satellite"),
        ];

        let root1 = calculate_merkle_root(&leaves);
        let root2 = calculate_merkle_root(&leaves);
        assert_eq!(root1, root2);
        assert_eq!(root1.len(), 64); // 32 bytes in hex
    }
}
