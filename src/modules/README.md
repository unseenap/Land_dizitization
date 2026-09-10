# Business modules

Fourteen domain modules own their contracts, services, data access and UI. Identity, audit, master-data, document-types and documents are implemented through Phase 2; other modules remain design boundaries. Every module README specifies responsibilities and invariants.

Keep module server code outside browser import graphs. Pass actor context and transaction/unit-of-work explicitly. Import other modules through public contracts/services, never private repositories.

See [ownership map](../../docs/MODULE_STRUCTURE.md).
