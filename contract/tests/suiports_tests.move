#[test_only]
module suiports::suiports_tests;

use sui::test_scenario as ts;
use suiports::suiports;

#[test]
fun test_deploy_registry_and_create_match() {
    let mut scenario = ts::begin(@0xA);
    // deploy registry (returns Registry object)
    let mut registry = suiports::deploy(ts::ctx(&mut scenario));

    // create match and get pool back (pool is now shared object)
    let mut labels: vector<vector<u8>> = vector::empty<vector<u8>>();
    vector::push_back<vector<u8>>(&mut labels, b"TeamA");
    vector::push_back<vector<u8>>(&mut labels, b"TeamB");
    suiports::create_match(&mut registry, @0xB, labels, 1, 200, ts::ctx(&mut scenario));

    // consume registry
    sui::transfer::public_transfer(registry, @0xA);
    ts::end(scenario);
}

#[test]
fun test_basic_flow() {
    let mut scenario = ts::begin(@admin);

    // deploy registry (returns Registry object)
    let mut registry = suiports::deploy(ts::ctx(&mut scenario));

    // create match (pool becomes shared object)
    let mut labels_fb: vector<vector<u8>> = vector::empty<vector<u8>>();
    vector::push_back<vector<u8>>(&mut labels_fb, b"HOME");
    vector::push_back<vector<u8>>(&mut labels_fb, b"AWAY");
    vector::push_back<vector<u8>>(&mut labels_fb, b"DRAW");
    suiports::create_match(&mut registry, @0xC, labels_fb, 10, 200, ts::ctx(&mut scenario));

    // consume registry
    sui::transfer::public_transfer(registry, @admin);
    ts::end(scenario);
}
