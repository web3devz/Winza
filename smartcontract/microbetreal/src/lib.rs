// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! Winzareal - Betting Wrapper Application */

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{AccountOwner, Amount, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

// Re-export from native-fungible-abi
pub use native_fungible_abi::{Prediction, ExtendedOperation, ExtendedResponse, ExtendedNativeFungibleTokenAbi};

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    // Cross-chain transfer with prediction
    TransferWithPrediction {
        owner: AccountOwner,
        amount: Amount,
        prediction: Prediction,
        source_chain_id: String, // Chain ID of the sender
        source_owner: AccountOwner,
    },
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct WinzaParameters {
    pub native_app_id: ::linera_sdk::linera_base_types::ApplicationId,
    pub rounds_app_id: ::linera_sdk::linera_base_types::ApplicationId,
}

// Winzareal implements the same ABI as NativeFungible (ExtendedNativeFungibleTokenAbi)
// This allows Rounds to call operations on Winzareal using the shared ABI
// Winzareal handles: TransferWithPrediction, SendReward, SetNativeAppId, SetRoundsAppId
// Other operations are passed through to Native app

pub struct WinzaAbi;

impl ContractAbi for WinzaAbi {
    type Operation = ExtendedOperation;
    type Response = ExtendedResponse;
}

impl ServiceAbi for WinzaAbi {
    type Query = Request;
    type QueryResponse = Response;
}