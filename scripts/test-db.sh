#!/usr/bin/env bash
# Prueba supabase/schema.sql en un PostgreSQL local, en una base de datos temporal.
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="${PSQL:-psql -X -v ON_ERROR_STOP=1}"
DB=futcards_test_$$
$PSQL -q -d postgres -c "create database $DB"
trap '$PSQL -q -d postgres -c "drop database $DB"' EXIT
$PSQL -q -d "$DB" -f supabase/local-stub.sql
$PSQL -q -d "$DB" -f supabase/schema.sql
$PSQL -q -d "$DB" -f supabase/schema.sql   # debe poder ejecutarse dos veces
$PSQL -d "$DB" -f supabase/tests.sql 2>&1 | grep -E "ok ·|FALLA|ERROR|TODAS" 
