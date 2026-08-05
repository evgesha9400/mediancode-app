# Median Code Recovery Protocol

This protocol reconstructs the Median Code application and its deployment
contracts without storing credentials or persistent data in this public
repository. Host reconstruction is owned by the private `server-admin`
repository. Configuration names and control planes are defined in
`CONFIGURATION.md`.

Recovery is complete only when development and production are independently
verified and any defect found in this protocol has been corrected, tested and
committed.

## Safety and stop conditions

1. Do not paste secret values into Git, terminal transcripts, issues, pull
   requests, recovery journals or chat.
2. Do not point development tests at production Clerk or PostgreSQL data.
3. Do not run with `DB_RESET=true` against persistent data.
4. Do not assume that rolling back an application image rolls back an Alembic
   schema migration.
5. Do not replace a surviving Clerk instance or database until identity and
   data continuity have been reviewed.
6. Stop if the required secret source, database backup, selected Git revision,
   or provider account cannot be authenticated.

## Recovery inputs

- this Git repository at a reviewed commit;
- the private `server-admin` repository at a compatible reviewed commit;
- access to GitHub, GHCR, Clerk, Vercel, DNS/Cloudflare and Tailscale;
- separately protected development and production secrets;
- an approved PostgreSQL backup or an explicitly selected surviving volume;
- a second Tailscale device for host and observability checks.

The repository deliberately does not disclose whether a current backup exists.
Confirm that privately before destructive work. A healthy empty database is not
a successful data recovery.

## Stage 1 — Select and validate source

1. Clone `https://github.com/evgesha9400/mediancode-app`.
2. Fetch all branches and tags.
3. Select the reviewed development or production commit; do not infer it from
   the newest timestamp alone.
4. Confirm the working tree is clean and inspect the selected commit.
5. Run:

   ```sh
   make config.check
   make install
   ```

6. Review `README.md`, `docs/operations/CONFIGURATION.md`, this protocol,
   `backend/deploy/mac-server/README.md`, and both environment documents.

## Stage 2 — Restore GitHub control-plane configuration

1. Confirm `develop` represents development and `main` represents production.
2. Recreate the `development` and `production` GitHub environments.
3. Restore the variables and secrets listed in `CONFIGURATION.md` from their
   approved sources. Do not copy values from logs or old workflow artifacts.
4. Confirm the Tailscale trust credential is restricted to this repository and
   the CI tag expected by the private tailnet policy.
5. Confirm the SSH private key corresponds to the restricted public key on the
   Mac and cannot open an unrestricted shell.
6. Confirm GHCR write access is provided only by the automatic job-scoped
   `GITHUB_TOKEN`.
7. Leave backend and frontend deploy enablement gates disabled until their
   dependencies have passed local and development verification.

## Stage 3 — Restore authentication safely

1. Recover access to the existing Clerk application and select the development
   instance.
2. Verify its publishable key, secret key, frontend API URL, enabled sign-in
   methods, allowed origins, redirect URLs and dedicated E2E user.
3. Install development values in local, GitHub and host control planes
   according to `CONFIGURATION.md`.
4. Repeat the inventory for the production Clerk instance without copying
   development values into it.
5. Verify a development token's issuer and, when configured, audience against
   the backend settings.
6. Confirm an existing user retains the same Clerk subject identifier expected
   by the application database.

Application ownership is linked to Clerk user IDs. If the original Clerk
identity cannot be recovered, stop and design an explicit, tested identity
mapping migration. Recreating accounts with the same email address is not proof
of identity continuity.

## Stage 4 — Restore frontend hosting

1. Recover the existing Vercel project or create a replacement only after its
   effect on domains and rollback has been reviewed.
2. Restore `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and `VERCEL_TOKEN` in the
   matching GitHub environments.
3. Restore Vercel Preview and Production public configuration from the matching
   Clerk and API environments.
4. Confirm `develop` maps to Preview and `main` maps to Production.
5. Confirm `dev.mediancode.com` and `mediancode.com` are assigned correctly.
6. Keep Vercel direct Git deployment disabled; GitHub Actions remains the test
   and deployment gate.

## Stage 5 — Restore the private Mac application contract

1. Follow the private `server-admin/RECOVERY_PROTOCOL.md` to recover the Mac,
   Tailscale, Colima, Docker, service catalog, Cloudflare Tunnel and Dozzle.
2. Confirm the catalog entry for `mediancode-app` declares both development and
   production, immutable GHCR images, loopback-only ports, health endpoints,
   required secret filenames and restart/resource limits.
3. Install the development Clerk and PostgreSQL secret files through the
   host's stdin-only management interface.
4. Repeat for production without reusing development credentials.
5. Verify file ownership and presence without printing contents.
6. Validate host configuration before deployment.

The app repository does not duplicate Compose files, tailnet policy, tunnel
credentials, secret files or live deployment state. Those remain private and
platform-owned so an application commit cannot expand host privileges.

## Stage 6 — Restore PostgreSQL data and schema

For each environment separately:

1. Identify the approved backup or deliberately selected surviving volume.
2. Record its creation time, database version, environment and integrity
   evidence privately.
3. Stop application writes before replacing an existing database.
4. Restore into an isolated or empty target rather than overwriting the only
   surviving copy.
5. Verify the expected database, roles, tables and row-count invariants without
   disclosing user data.
6. Record the restored Alembic revision:

   ```sh
   cd backend
   poetry run alembic current
   poetry run alembic history
   ```

7. Review every pending migration and its downgrade before starting the new
   image. Take a fresh pre-migration backup when persistent data is involved.
8. Start the application, allowing `alembic upgrade head` only after the
   compatibility review.
9. Verify application reads and authenticated ownership, not merely database
   health.

### Migration and rollback rule

Every schema-changing pull request must state:

- the old and new Alembic revisions;
- whether the old application works with the new schema;
- whether downgrade is implemented and data-preserving;
- the required pre-deployment backup;
- the recovery procedure if startup migration fails.

If backward compatibility is not demonstrated, application rollback requires a
coordinated database restore or migration downgrade. Never present an image-only
rollback as sufficient in that case.

## Stage 7 — Recover development first

1. Keep production deploy gates disabled.
2. Enable the development deployment gates only after Clerk, Vercel, Mac host
   secrets and the development database pass their checks.
3. Push or rerun the reviewed `develop` commit through the normal GitHub Actions
   path; do not deploy a locally built untracked image.
4. Confirm CI builds and attests the immutable Linux/AMD64 backend image.
5. Confirm the restricted Tailscale/SSH job deploys the reported digest.
6. Confirm Vercel deploys the tested frontend artifact and assigns the
   development alias.
7. Verify:

   ```sh
   curl --fail https://api-dev.mediancode.com/health
   curl --fail --location https://dev.mediancode.com/
   ```

8. Run the full authenticated frontend E2E suite against development.
9. Inspect bounded development API and database logs through Dozzle and confirm
   no migration, authentication or repeated restart failure.

## Stage 8 — Promote the verified commit to production

1. Confirm development uses the exact commit intended for production.
2. Review the complete `develop` to `main` diff, database migration impact and
   external-configuration changes.
3. Obtain explicit production approval.
4. Fast-forward `main` to the verified `develop` commit; do not cherry-pick or
   reimplement the recovery changes.
5. Let the normal production GitHub Actions workflows build and deploy.
6. Verify the production image digest and frontend deployment correspond to the
   promoted commit.
7. Verify:

   ```sh
   curl --fail https://api.mediancode.com/health
   curl --fail --location https://mediancode.com/
   ```

8. Perform a bounded authenticated production smoke test that does not create
   destructive test data.
9. Confirm production logs, container health and resource use are normal.

## Stage 9 — Restart and independent verification

Through the private platform protocol and with explicit reboot approval:

1. restart the closed-lid Mac;
2. reconnect from a second Tailscale device without local graphical login;
3. run the platform recovery verifier;
4. confirm both application environments, Cloudflare routes, Dozzle, SSH and
   Screen Sharing recovered;
5. confirm both public health endpoints and frontends;
6. confirm no sleep or thermal-pressure warning occurred.

## Mandatory repair and autophagy loop

If any recovery instruction is missing, stale, ambiguous or wrong:

1. pause downstream recovery work;
2. capture sanitized evidence: expected result, actual result, exact error and
   relevant versions;
3. classify the cause as documentation drift, missing configuration, script or
   workflow defect, provider drift, data incompatibility or undeclared
   dependency;
4. apply the smallest supported and reversible correction;
5. rerun the failed check and every dependent gate;
6. update this protocol, `CONFIGURATION.md`, the machine-readable contract,
   examples, workflows, rollback notes and relevant agent guidance together;
7. remove superseded variables, instructions, helpers, temporary credentials,
   artifacts and compatibility scaffolding; preserve required audit evidence
   and valid rollback paths;
8. run `make config.check`, the affected test suites and the appropriate E2E
   verification;
9. inspect the complete diff for secret values and personal data before commit.

An undocumented provider setting or local workaround is an unresolved recovery
defect. Documentation that has not been exercised is a hypothesis, not verified
recovery evidence.

## Closeout

1. Confirm development and production revisions, image digests, schema
   revisions and health checks.
2. Sanitize recovery lessons and commit the corrected protocol.
3. Remove temporary downloads, generated provider directories, local secret
   copies, test output, obsolete images and abandoned configuration.
4. Keep active definitions, required rollback evidence and separate secret/data
   recovery sources.
5. Re-run `make config.check` and the full relevant verification suite.
6. Delete any raw recovery journal only after its safe findings have been
   incorporated and the user approves its deletion.
