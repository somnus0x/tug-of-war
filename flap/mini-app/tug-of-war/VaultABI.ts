// Fragments of the deployed Tug of War contracts on BSC testnet (chain 97).
// Source: contracts/abi in the tug-of-war repo. Shared tooling keeps this file name.
export const LAUNCHER_ABI = [
 {
  "type": "function",
  "name": "canClaim",
  "inputs": [
   {
    "name": "player",
    "type": "address"
   }
  ],
  "outputs": [
   {
    "name": "ok",
    "type": "bool"
   },
   {
    "name": "reason",
    "type": "bytes4"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "canContribute",
  "inputs": [
   {
    "name": "player",
    "type": "address"
   },
   {
    "name": "team",
    "type": "uint8"
   },
   {
    "name": "amount",
    "type": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "ok",
    "type": "bool"
   },
   {
    "name": "reason",
    "type": "bytes4"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "canDepositCaptain",
  "inputs": [
   {
    "name": "captain",
    "type": "address"
   },
   {
    "name": "amount",
    "type": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "ok",
    "type": "bool"
   },
   {
    "name": "reason",
    "type": "bytes4"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "canLaunch",
  "inputs": [],
  "outputs": [
   {
    "name": "ok",
    "type": "bool"
   },
   {
    "name": "reason",
    "type": "bytes4"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "canRefund",
  "inputs": [
   {
    "name": "player",
    "type": "address"
   }
  ],
  "outputs": [
   {
    "name": "ok",
    "type": "bool"
   },
   {
    "name": "reason",
    "type": "bytes4"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "captainIn",
  "inputs": [
   {
    "name": "team",
    "type": "uint8"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "claim",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimCaptain",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "contribute",
  "inputs": [
   {
    "name": "team",
    "type": "uint8"
   }
  ],
  "outputs": [],
  "stateMutability": "payable"
 },
 {
  "type": "function",
  "name": "depositCaptain",
  "inputs": [],
  "outputs": [],
  "stateMutability": "payable"
 },
 {
  "type": "function",
  "name": "getGame",
  "inputs": [],
  "outputs": [
   {
    "name": "game",
    "type": "tuple",
    "components": [
     {
      "name": "launcher",
      "type": "address"
     },
     {
      "name": "creator",
      "type": "address"
     },
     {
      "name": "factory",
      "type": "address"
     },
     {
      "name": "config",
      "type": "tuple",
      "components": [
       {
        "name": "name",
        "type": "string"
       },
       {
        "name": "symbol",
        "type": "string"
       },
       {
        "name": "meta",
        "type": "string"
       },
       {
        "name": "salt",
        "type": "bytes32"
       },
       {
        "name": "duration",
        "type": "uint64"
       },
       {
        "name": "minRaise",
        "type": "uint256"
       },
       {
        "name": "walletCap",
        "type": "uint256"
       },
       {
        "name": "captainBlue",
        "type": "address"
       },
       {
        "name": "captainRed",
        "type": "address"
       },
       {
        "name": "vaultFactory",
        "type": "address"
       },
       {
        "name": "maxBonusShareBps",
        "type": "uint16"
       },
       {
        "name": "captainMinDeposit",
        "type": "uint256"
       },
       {
        "name": "acceptWindow",
        "type": "uint64"
       },
       {
        "name": "captainAllocBps",
        "type": "uint16"
       },
       {
        "name": "captainVestDuration",
        "type": "uint64"
       },
       {
        "name": "captainShareBps",
        "type": "uint16"
       }
      ]
     },
     {
      "name": "phase",
      "type": "uint8"
     },
     {
      "name": "captainDeposited",
      "type": "tuple",
      "components": [
       {
        "name": "blue",
        "type": "bool"
       },
       {
        "name": "red",
        "type": "bool"
       }
      ]
     },
     {
      "name": "acceptDeadline",
      "type": "uint64"
     },
     {
      "name": "gameStart",
      "type": "uint64"
     },
     {
      "name": "originalDeadline",
      "type": "uint64"
     },
     {
      "name": "deadline",
      "type": "uint64"
     },
     {
      "name": "extensionsUsed",
      "type": "uint8"
     },
     {
      "name": "currentWeightBps",
      "type": "uint16"
     },
     {
      "name": "raised",
      "type": "uint256"
     },
     {
      "name": "raisedByTeam",
      "type": "tuple",
      "components": [
       {
        "name": "blue",
        "type": "uint256"
       },
       {
        "name": "red",
        "type": "uint256"
       }
      ]
     },
     {
      "name": "pullByTeam",
      "type": "tuple",
      "components": [
       {
        "name": "blue",
        "type": "uint256"
       },
       {
        "name": "red",
        "type": "uint256"
       }
      ]
     },
     {
      "name": "playersByTeam",
      "type": "tuple",
      "components": [
       {
        "name": "blue",
        "type": "uint256"
       },
       {
        "name": "red",
        "type": "uint256"
       }
      ]
     },
     {
      "name": "ropeBps",
      "type": "uint16"
     },
     {
      "name": "autoLaunchRequestId",
      "type": "uint256"
     },
     {
      "name": "triggerBudget",
      "type": "uint256"
     },
     {
      "name": "triggerFunder",
      "type": "address"
     },
     {
      "name": "token",
      "type": "address"
     },
     {
      "name": "pool",
      "type": "address"
     },
     {
      "name": "vault",
      "type": "address"
     },
     {
      "name": "finalBlueShareBps",
      "type": "uint16"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getPlayer",
  "inputs": [
   {
    "name": "player",
    "type": "address"
   }
  ],
  "outputs": [
   {
    "name": "playerView",
    "type": "tuple",
    "components": [
     {
      "name": "team",
      "type": "uint8"
     },
     {
      "name": "contribution",
      "type": "uint256"
     },
     {
      "name": "pull",
      "type": "uint256"
     },
     {
      "name": "baseEntitlement",
      "type": "uint256"
     },
     {
      "name": "bonusEntitlement",
      "type": "uint256"
     },
     {
      "name": "claimed",
      "type": "uint256"
     },
     {
      "name": "claimable",
      "type": "uint256"
     },
     {
      "name": "refundable",
      "type": "uint256"
     },
     {
      "name": "remainingCap",
      "type": "uint256"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getRules",
  "inputs": [],
  "outputs": [
   {
    "name": "rules",
    "type": "tuple",
    "components": [
     {
      "name": "buyTaxBps",
      "type": "uint16"
     },
     {
      "name": "sellTaxBps",
      "type": "uint16"
     },
     {
      "name": "vaultFeeBps",
      "type": "uint16"
     },
     {
      "name": "deflationFeeBps",
      "type": "uint16"
     },
     {
      "name": "captainShareBps",
      "type": "uint16"
     },
     {
      "name": "poolAllocBps",
      "type": "uint16"
     },
     {
      "name": "baseAllocBps",
      "type": "uint16"
     },
     {
      "name": "bonusAllocBps",
      "type": "uint16"
     },
     {
      "name": "captainAllocBps",
      "type": "uint16"
     },
     {
      "name": "maxBonusShareBps",
      "type": "uint16"
     },
     {
      "name": "captainVestDuration",
      "type": "uint64"
     },
     {
      "name": "taxDuration",
      "type": "uint32"
     },
     {
      "name": "antiFarmerDuration",
      "type": "uint32"
     },
     {
      "name": "startWeightBps",
      "type": "uint16"
     },
     {
      "name": "overtimeWindow",
      "type": "uint64"
     },
     {
      "name": "overtimeExtension",
      "type": "uint64"
     },
     {
      "name": "maxExtensions",
      "type": "uint8"
     },
     {
      "name": "launchGrace",
      "type": "uint64"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "launch",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "previewContribute",
  "inputs": [
   {
    "name": "team",
    "type": "uint8"
   },
   {
    "name": "amount",
    "type": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "pull",
    "type": "uint256"
   },
   {
    "name": "newRopeBps",
    "type": "uint16"
   },
   {
    "name": "wouldTriggerOvertime",
    "type": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "refund",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "Contributed",
  "inputs": [
   {
    "name": "player",
    "type": "address",
    "indexed": true
   },
   {
    "name": "team",
    "type": "uint8",
    "indexed": true
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false
   },
   {
    "name": "pull",
    "type": "uint256",
    "indexed": false
   },
   {
    "name": "weightBps",
    "type": "uint16",
    "indexed": false
   },
   {
    "name": "ropeBps",
    "type": "uint16",
    "indexed": false
   }
  ],
  "anonymous": false
 }
] as const;
export const FACTORY_ABI = [
 {
  "type": "function",
  "name": "defaultConfig",
  "inputs": [],
  "outputs": [
   {
    "name": "config",
    "type": "tuple",
    "components": [
     {
      "name": "name",
      "type": "string"
     },
     {
      "name": "symbol",
      "type": "string"
     },
     {
      "name": "meta",
      "type": "string"
     },
     {
      "name": "salt",
      "type": "bytes32"
     },
     {
      "name": "duration",
      "type": "uint64"
     },
     {
      "name": "minRaise",
      "type": "uint256"
     },
     {
      "name": "walletCap",
      "type": "uint256"
     },
     {
      "name": "captainBlue",
      "type": "address"
     },
     {
      "name": "captainRed",
      "type": "address"
     },
     {
      "name": "vaultFactory",
      "type": "address"
     },
     {
      "name": "maxBonusShareBps",
      "type": "uint16"
     },
     {
      "name": "captainMinDeposit",
      "type": "uint256"
     },
     {
      "name": "acceptWindow",
      "type": "uint64"
     },
     {
      "name": "captainAllocBps",
      "type": "uint16"
     },
     {
      "name": "captainVestDuration",
      "type": "uint64"
     },
     {
      "name": "captainShareBps",
      "type": "uint16"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "encodeConfig",
  "inputs": [
   {
    "name": "config",
    "type": "tuple",
    "components": [
     {
      "name": "name",
      "type": "string"
     },
     {
      "name": "symbol",
      "type": "string"
     },
     {
      "name": "meta",
      "type": "string"
     },
     {
      "name": "salt",
      "type": "bytes32"
     },
     {
      "name": "duration",
      "type": "uint64"
     },
     {
      "name": "minRaise",
      "type": "uint256"
     },
     {
      "name": "walletCap",
      "type": "uint256"
     },
     {
      "name": "captainBlue",
      "type": "address"
     },
     {
      "name": "captainRed",
      "type": "address"
     },
     {
      "name": "vaultFactory",
      "type": "address"
     },
     {
      "name": "maxBonusShareBps",
      "type": "uint16"
     },
     {
      "name": "captainMinDeposit",
      "type": "uint256"
     },
     {
      "name": "acceptWindow",
      "type": "uint64"
     },
     {
      "name": "captainAllocBps",
      "type": "uint16"
     },
     {
      "name": "captainVestDuration",
      "type": "uint64"
     },
     {
      "name": "captainShareBps",
      "type": "uint16"
     }
    ]
   }
  ],
  "outputs": [
   {
    "name": "data",
    "type": "bytes"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "gameAt",
  "inputs": [
   {
    "name": "index",
    "type": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "launcher",
    "type": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "gamesCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "limits",
  "inputs": [],
  "outputs": [
   {
    "name": "configLimits",
    "type": "tuple",
    "components": [
     {
      "name": "duration",
      "type": "tuple",
      "components": [
       {
        "name": "min",
        "type": "uint64"
       },
       {
        "name": "max",
        "type": "uint64"
       }
      ]
     },
     {
      "name": "acceptWindow",
      "type": "tuple",
      "components": [
       {
        "name": "min",
        "type": "uint64"
       },
       {
        "name": "max",
        "type": "uint64"
       }
      ]
     },
     {
      "name": "captainVestDuration",
      "type": "tuple",
      "components": [
       {
        "name": "min",
        "type": "uint64"
       },
       {
        "name": "max",
        "type": "uint64"
       }
      ]
     },
     {
      "name": "maxBonusShareBps",
      "type": "tuple",
      "components": [
       {
        "name": "min",
        "type": "uint16"
       },
       {
        "name": "max",
        "type": "uint16"
       }
      ]
     },
     {
      "name": "captainAllocBps",
      "type": "tuple",
      "components": [
       {
        "name": "min",
        "type": "uint16"
       },
       {
        "name": "max",
        "type": "uint16"
       }
      ]
     },
     {
      "name": "captainShareBps",
      "type": "tuple",
      "components": [
       {
        "name": "min",
        "type": "uint16"
       },
       {
        "name": "max",
        "type": "uint16"
       }
      ]
     },
     {
      "name": "minRaiseFloor",
      "type": "uint256"
     },
     {
      "name": "creationFloorAvailable",
      "type": "bool"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pairedVaultFactory",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "portal",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "predictToken",
  "inputs": [
   {
    "name": "salt",
    "type": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "token",
    "type": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "tokenImplementation",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "validateConfig",
  "inputs": [
   {
    "name": "config",
    "type": "tuple",
    "components": [
     {
      "name": "name",
      "type": "string"
     },
     {
      "name": "symbol",
      "type": "string"
     },
     {
      "name": "meta",
      "type": "string"
     },
     {
      "name": "salt",
      "type": "bytes32"
     },
     {
      "name": "duration",
      "type": "uint64"
     },
     {
      "name": "minRaise",
      "type": "uint256"
     },
     {
      "name": "walletCap",
      "type": "uint256"
     },
     {
      "name": "captainBlue",
      "type": "address"
     },
     {
      "name": "captainRed",
      "type": "address"
     },
     {
      "name": "vaultFactory",
      "type": "address"
     },
     {
      "name": "maxBonusShareBps",
      "type": "uint16"
     },
     {
      "name": "captainMinDeposit",
      "type": "uint256"
     },
     {
      "name": "acceptWindow",
      "type": "uint64"
     },
     {
      "name": "captainAllocBps",
      "type": "uint16"
     },
     {
      "name": "captainVestDuration",
      "type": "uint64"
     },
     {
      "name": "captainShareBps",
      "type": "uint16"
     }
    ]
   }
  ],
  "outputs": [
   {
    "name": "ok",
    "type": "bool"
   },
   {
    "name": "reason",
    "type": "bytes4"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "TugLauncherCreated",
  "inputs": [
   {
    "name": "launcher",
    "type": "address",
    "indexed": true
   },
   {
    "name": "creator",
    "type": "address",
    "indexed": false
   },
   {
    "name": "captainBlue",
    "type": "address",
    "indexed": true
   },
   {
    "name": "captainRed",
    "type": "address",
    "indexed": true
   },
   {
    "name": "salt",
    "type": "bytes32",
    "indexed": false
   }
  ],
  "anonymous": false
 }
] as const;
export const PORTAL_ABI = [
 {
  "type": "function",
  "name": "SALT_LOCK_FEE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "newLauncher",
  "inputs": [
   {
    "name": "launcherFactory",
    "type": "address"
   },
   {
    "name": "data",
    "type": "bytes"
   }
  ],
  "outputs": [
   {
    "name": "launcher",
    "type": "address"
   }
  ],
  "stateMutability": "payable"
 }
] as const;
export const VaultABI = LAUNCHER_ABI;
