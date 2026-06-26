#![cfg(test)]
//! End-to-end tests that run the *real* deployed verifier WASM (embedded via
//! `contractimport!`) against a *real* Groth16 proof produced by
//! `scripts/gen-proof.mjs`. No network, fully deterministic.

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger as _},
    Bytes, BytesN, Env, U256,
};

// Real proof bytes (G1 = x||y, G2 = x.c1||x.c0||y.c1||y.c0) from build/arg_proof.json.
const PROOF_A: &str = "06b93f96ed20999901cc48454c3c679c7dba1cce9d8705938400f1b7268b75e62e826fa485e93ba4d9b087df52b68f551116c8224bc212144a2ec513d4768829";
const PROOF_B: &str = "0506e0126ea65f0682a5518398abc386396b5760d35a7348dac5450c91160eb92e7015079ae46f073a41d6bf9a1c7df6b282a74397d973d685a0b38ca6102cdf1bb7eacb941ed9efe0a2b3e784953b3726acb9f322f8da095e0e2b8857ce93191a66849b4354139a76be8d621516c2702a9f8b329caa583a03278dd7201bfa27";
const PROOF_C: &str = "1efddd1616f866a6ca2d9564042072fe552160f544665c12f5c6a952ec934dbb0e3908022f9ad683338d0f2f3589441e7bc594e2a5b23e63d75741795fadf430";

// Public inputs as 32-byte BE hex: [registryRoot, nullifierHash, agentId=42, spendCap=500000000].
const PI_ROOT: &str = "06c8e54da15f2c1dd4862d76e1cf2d1408df5d9001c172a0600e8ceaaf227fca";
const PI_NULLIFIER: &str = "2adfb605cf2fb6779aa04e1e900c841436903d781eb9166fcdbf1c55b5140b14";
const PI_AGENT: &str = "000000000000000000000000000000000000000000000000000000000000002a";
const PI_CAP: &str = "000000000000000000000000000000000000000000000000000000001dcd6500";

fn unhex(s: &str) -> std::vec::Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap())
        .collect()
}

fn bytesn<const N: usize>(env: &Env, hex: &str) -> BytesN<N> {
    let v = unhex(hex);
    let mut arr = [0u8; N];
    arr.copy_from_slice(&v);
    BytesN::from_array(env, &arr)
}

fn u256(env: &Env, hex: &str) -> U256 {
    U256::from_be_bytes(env, &Bytes::from_slice(env, &unhex(hex)))
}

fn real_proof(env: &Env) -> Groth16Proof {
    Groth16Proof {
        a: bytesn(env, PROOF_A),
        b: bytesn(env, PROOF_B),
        c: bytesn(env, PROOF_C),
    }
}

fn real_public_inputs(env: &Env) -> Vec<U256> {
    Vec::from_array(
        env,
        [
            u256(env, PI_ROOT),
            u256(env, PI_NULLIFIER),
            u256(env, PI_AGENT),
            u256(env, PI_CAP),
        ],
    )
}

/// Deploy the real verifier WASM + our validator, init the wiring, return both.
fn setup(env: &Env, initial_root: U256) -> AgentPassportValidatorClient<'static> {
    let (_, _, client) = setup_with_id(env, initial_root);
    client
}

fn setup_with_id(
    env: &Env,
    initial_root: U256,
) -> (Address, Address, AgentPassportValidatorClient<'static>) {
    let admin = Address::generate(env);
    let (validator_addr, client) = setup_with_admin_id(env, initial_root, admin.clone());
    (validator_addr, admin, client)
}

fn setup_with_admin_id(
    env: &Env,
    initial_root: U256,
    admin: Address,
) -> (Address, AgentPassportValidatorClient<'static>) {
    let verifier_addr = env.register(verifier::WASM, ());
    let validator_addr = env.register(AgentPassportValidator, ());
    let client = AgentPassportValidatorClient::new(env, &validator_addr);
    client.init(&admin, &verifier_addr, &initial_root);
    (validator_addr, client)
}

#[test]
fn registers_a_valid_passport() {
    let env = Env::default();
    env.ledger().set_sequence_number(1000);
    let client = setup(&env, u256(&env, PI_ROOT));

    let agent_id = u256(&env, PI_AGENT);
    assert!(!client.is_registered(&agent_id));

    let att = client.verify_and_register(&real_proof(&env), &real_public_inputs(&env));

    assert_eq!(att.agent_id, agent_id);
    assert_eq!(att.spend_cap, u256(&env, PI_CAP));
    assert_eq!(att.ledger, 1000);
    assert!(client.is_registered(&agent_id));
    assert!(client.is_nullifier_used(&u256(&env, PI_NULLIFIER)));

    let stored = client.get_passport(&agent_id).unwrap();
    assert_eq!(stored.nullifier, u256(&env, PI_NULLIFIER));
}

#[test]
fn typed_passport_registered_event_keeps_legacy_shape() {
    let env = Env::default();
    let (validator_addr, _, client) = setup_with_id(&env, u256(&env, PI_ROOT));
    let agent_id = u256(&env, PI_AGENT);
    let nullifier = u256(&env, PI_NULLIFIER);
    let spend_cap = u256(&env, PI_CAP);

    let _typed_event = PassportRegistered {
        agent_id: agent_id.clone(),
        nullifier: nullifier.clone(),
        spend_cap: spend_cap.clone(),
    };

    client.verify_and_register(&real_proof(&env), &real_public_inputs(&env));

    assert!(
        env.events()
            .all()
            .filter_by_contract(&validator_addr)
            .events()
            .len()
            >= 1
    );
}

#[test]
fn rejects_nullifier_replay() {
    let env = Env::default();
    let client = setup(&env, u256(&env, PI_ROOT));

    // First spend succeeds.
    client.verify_and_register(&real_proof(&env), &real_public_inputs(&env));

    // Same proof again -> nullifier already spent.
    let res = client.try_verify_and_register(&real_proof(&env), &real_public_inputs(&env));
    assert_eq!(res, Err(Ok(Error::NullifierUsed)));
}

#[test]
fn rejects_tampered_public_input() {
    let env = Env::default();
    let client = setup(&env, u256(&env, PI_ROOT));

    // Tamper the spend cap; the proof no longer matches -> InvalidProof.
    let mut inputs = real_public_inputs(&env);
    inputs.set(
        IDX_SPEND_CAP,
        u256(&env, PI_CAP).add(&U256::from_u32(&env, 1)),
    );

    let res = client.try_verify_and_register(&real_proof(&env), &inputs);
    assert_eq!(res, Err(Ok(Error::InvalidProof)));
    // A failed verification must NOT burn the nullifier.
    assert!(!client.is_nullifier_used(&u256(&env, PI_NULLIFIER)));
}

#[test]
fn rejects_wrong_input_count() {
    let env = Env::default();
    let client = setup(&env, u256(&env, PI_ROOT));

    let short = Vec::from_array(&env, [u256(&env, PI_ROOT), u256(&env, PI_NULLIFIER)]);
    let res = client.try_verify_and_register(&real_proof(&env), &short);
    assert_eq!(res, Err(Ok(Error::BadPublicInputs)));
}

#[test]
fn public_heartbeat_keeps_instance_storage_alive() {
    let env = Env::default();
    env.ledger().set_sequence_number(1000);
    let (_, _, client) = setup_with_id(&env, u256(&env, PI_ROOT));
    let verifier = client.verifier();

    env.ledger().set_sequence_number(1000 + TTL_THRESHOLD + 1);
    client.bump_ttl();

    assert_eq!(client.verifier(), verifier);
}

#[test]
#[should_panic]
fn init_is_one_shot() {
    let env = Env::default();
    let client = setup(&env, u256(&env, PI_ROOT));
    let admin = Address::generate(&env);
    let verifier_addr = Address::generate(&env);
    let root = u256(&env, PI_ROOT);
    // Second init must panic with AlreadyInitialized.
    client.init(&admin, &verifier_addr, &root);
}

#[test]
fn rejects_unknown_registry_root() {
    let env = Env::default();
    // Initialize with a different root than what's in the proof.
    let other_root = u256(&env, PI_ROOT).add(&U256::from_u32(&env, 1));
    let client = setup(&env, other_root);

    let res = client.try_verify_and_register(&real_proof(&env), &real_public_inputs(&env));
    assert_eq!(res, Err(Ok(Error::UnknownRegistryRoot)));
}

#[test]
fn can_manage_registry_roots() {
    let env = Env::default();
    // Start with an unrelated root.
    let other_root = u256(&env, PI_ROOT).add(&U256::from_u32(&env, 1));
    let client = setup(&env, other_root.clone());
    let real_root = u256(&env, PI_ROOT);

    assert!(!client.is_registry_root_approved(&real_root));

    // Admin adds the real root.
    env.mock_all_auths();
    client.add_registry_root(&real_root);
    assert!(client.is_registry_root_approved(&real_root));

    // Now registration succeeds.
    client.verify_and_register(&real_proof(&env), &real_public_inputs(&env));
    assert!(client.is_registered(&u256(&env, PI_AGENT)));

    // Admin removes the root.
    client.remove_registry_root(&real_root);
    assert!(!client.is_registry_root_approved(&real_root));
}

#[test]
fn set_verifier_emits_event() {
    let env = Env::default();
    let (validator_addr, _, client) = setup_with_id(&env, u256(&env, PI_ROOT));
    let new_verifier = Address::generate(&env);

    env.mock_all_auths();
    client.set_verifier(&new_verifier);

    assert!(
        env.events()
            .all()
            .filter_by_contract(&validator_addr)
            .events()
            .len()
            >= 1
    );
}

#[test]
fn two_step_admin_transfer() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let (validator_addr, client) = setup_with_admin_id(&env, u256(&env, PI_ROOT), admin.clone());
    let new_admin = Address::generate(&env);

    // Step 1: transfer_admin
    env.mock_all_auths();
    client.transfer_admin(&new_admin);

    assert!(
        env.events()
            .all()
            .filter_by_contract(&validator_addr)
            .events()
            .len()
            >= 1
    );

    // Step 2: accept_admin
    client.accept_admin();

    assert!(
        env.events()
            .all()
            .filter_by_contract(&validator_addr)
            .events()
            .len()
            >= 1
    );

    // Verify new admin can perform admin actions
    client.add_registry_root(&U256::from_u32(&env, 123));
}

#[test]
fn renounce_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let (validator_addr, client) = setup_with_admin_id(&env, u256(&env, PI_ROOT), admin.clone());

    env.mock_all_auths();
    client.renounce_admin();

    assert!(
        env.events()
            .all()
            .filter_by_contract(&validator_addr)
            .events()
            .len()
            >= 1
    );

    // Admin actions should now fail
    let res = client.try_add_registry_root(&U256::from_u32(&env, 123));
    assert!(res.is_err());

    // Re-init should also fail
    let res = client.try_init(
        &Address::generate(&env),
        &Address::generate(&env),
        &U256::from_u32(&env, 123),
    );
    assert!(res.is_err());
}
