#!/usr/bin/env python3
"""Extract the canonical Kaggriculture rulepack from the official environment.

Single source of truth for every published game constant. Three separate engines
in this project encode these numbers — the private agent (Python), the FieldTape
browser engine (TypeScript), and the Supabase challenge verifier (Deno) — and
nothing previously kept them equal. They had already drifted, in the direction
that costs money: the competition agent was using WHEAT max_yield 4 when the
official value is 6.

So the numbers are never typed by hand. This script imports the installed
official module and dumps its module-level tables verbatim, with a SHA-256 over
the canonical JSON so any downstream copy can prove it is current.

Usage:
    python3 rules/extract_rulepack.py                 # uses ambient python
    agent/.venv/bin/python rules/extract_rulepack.py  # uses the pinned venv

Re-run after any kaggle-environments upgrade. If the hash changes, every engine's
conformance test fails until it is reconciled — which is the entire point.
"""

from __future__ import annotations

import hashlib
import importlib
import json
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent / "kaggriculture.v1.json"


def main() -> int:
    try:
        env = importlib.import_module(
            "kaggle_environments.envs.kaggriculture.kaggriculture"
        )
    except ModuleNotFoundError:
        print(
            "kaggle-environments is not importable by this interpreter.\n"
            "Install the pinned version in an isolated venv first:\n"
            "  python3 -m venv agent/.venv\n"
            '  agent/.venv/bin/pip install "kaggle-environments==1.32.6"\n'
            "then re-run with agent/.venv/bin/python.",
            file=sys.stderr,
        )
        return 1

    import kaggle_environments

    # Only module-level constant tables. Deliberately not derived or reshaped:
    # a rulepack that "helpfully" normalises names is a second place for a
    # transcription bug to live.
    payload = {
        "$schema": "fieldtape/rulepack/v1",
        "source": {
            "package": "kaggle-environments",
            # Note: kaggle_environments.version is a *function*, not a module.
            "version": getattr(kaggle_environments, "__version__", "unknown"),
            "module": env.__name__,
            "note": (
                "Extracted verbatim from the official interpreter. Live Kaggle "
                "behaviour overrides this capture if they ever disagree."
            ),
        },
        "crops": env.CROPS,
        "animals": env.ANIMALS,
        "products": env.PRODUCTS,
        "market": {
            "I0": env.MARKET_I0,
            "priceFloor": env.PRICE_FLOOR,
            "params": env.MARKET_PARAMS,
        },
        "farmerMoves": {k: list(v) for k, v in env.FARMER_MOVES.items()},
        "land": {"order": env.LAND_ORDER, "prices": env.LAND_PRICES},
        "farmHandCostMult": env.FARM_HAND_COST_MULT,
        "shops": env.SHOPS,
        "townCenterProducts": env.TOWN_CENTER_PRODUCTS,
        "maxShopInstances": env.MAX_SHOP_INSTANCES,
    }

    # Optional module-level constants: present in some revisions, absent in
    # others. Recorded when available rather than assumed, so the pack never
    # invents a value.
    for name, key in [
        ("SEASON_DAYS", "seasonDays"),
        ("TURNS_PER_DAY", "turnsPerDay"),
        ("BOARD_SIZE", "boardSize"),
        ("SHED_CAPACITY", "shedCapacity"),
        ("MAX_MARKET_ORDERS", "maxMarketOrders"),
        ("STARTING_MONEY", "startingMoney"),
    ]:
        if hasattr(env, name):
            payload[key] = getattr(env, name)

    # Board size, season length, shed capacity and starting money are NOT
    # module constants — they are configuration defaults in kaggriculture.json.
    # Reading them from the spec keeps the pack complete without hardcoding.
    spec_path = pathlib.Path(env.__file__).with_name("kaggriculture.json")
    spec = json.loads(spec_path.read_text())
    config_defaults = {
        key: node["default"]
        for key, node in spec.get("configuration", {}).items()
        if isinstance(node, dict)
        and "default" in node
        and not isinstance(node["default"], (dict, list))
        and node["default"] is not None
    }
    payload["configDefaults"] = config_defaults
    # episodeSteps carries the season length as total turns.
    episode_steps = spec.get("configuration", {}).get("episodeSteps", {})
    if isinstance(episode_steps, dict) and "default" in episode_steps:
        payload["episodeSteps"] = episode_steps["default"]

    body = json.dumps(payload, indent=2, sort_keys=True)
    digest = hashlib.sha256(body.encode()).hexdigest()
    final = json.dumps(
        {**payload, "sha256": digest}, indent=2, sort_keys=True
    )
    OUT.write_text(final + "\n")

    print(f"wrote {OUT}")
    print(f"sha256(body) = {digest}")
    print(f"crops={len(payload['crops'])} animals={len(payload['animals'])} "
          f"products={len(payload['products'])} shops={len(payload['shops'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
