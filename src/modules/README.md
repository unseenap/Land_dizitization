# Business modules

Fourteen domain modules own their contracts, services, data access and UI. Every module README specifies responsibilities and invariants. These are design folders, not working features.

Keep module server code outside browser import graphs. Pass actor context and transaction/unit-of-work explicitly. Import other modules through public contracts/services, never private repositories.

See [ownership map](../../docs/MODULE_STRUCTURE.md).
