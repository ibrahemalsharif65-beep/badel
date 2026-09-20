#!/usr/bin/env bash
# Runs migrations + seed + RLS test-suite against a throw-away local Postgres DB.
# Requires a local Postgres reachable via the default psql connection.
set -euo pipefail
cd "$(dirname "$0")"
DB=badel_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
# roles are cluster-wide; ignore "already exists" on re-runs
for r in anon authenticated service_role; do psql -q -d postgres -c "drop role if exists $r" 2>/dev/null || true; done
psql -q -v ON_ERROR_STOP=1 -d $DB -f 00_supabase_stubs.sql
for m in ../migrations/*.sql; do echo ">> applying $(basename "$m")"; psql -q -v ON_ERROR_STOP=1 -d $DB -f "$m"; done
psql -v ON_ERROR_STOP=1 -d $DB -f 10_rls_and_behaviour.sql 2>&1 | grep -E "PASS|FAIL|ERROR|ALL CHECKS|===|DETAIL|CONTEXT" 
