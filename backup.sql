--
-- PostgreSQL database dump
--

\restrict 51I2pdA9XhpqcHNs8U4puOFhLYEhMAeO1uGzG88X0803WoyPqBD9iU2eknmpl5U

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: keycloak; Type: SCHEMA; Schema: -; Owner: projecthub
--

CREATE SCHEMA keycloak;


ALTER SCHEMA keycloak OWNER TO projecthub;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: next_sequence_id(uuid); Type: FUNCTION; Schema: public; Owner: projecthub
--

CREATE FUNCTION public.next_sequence_id(project_uuid uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
            DECLARE
              next_id INTEGER;
            BEGIN
              SELECT COALESCE(MAX(sequence_id), 0) + 1
              INTO next_id
              FROM issues
              WHERE project_id = project_uuid;

              RETURN next_id;
            END;
            $$;


ALTER FUNCTION public.next_sequence_id(project_uuid uuid) OWNER TO projecthub;

--
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: projecthub
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_updated_at() OWNER TO projecthub;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_event_entity; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.admin_event_entity (
    id character varying(36) NOT NULL,
    admin_event_time bigint,
    realm_id character varying(255),
    operation_type character varying(255),
    auth_realm_id character varying(255),
    auth_client_id character varying(255),
    auth_user_id character varying(255),
    ip_address character varying(255),
    resource_path character varying(2550),
    representation text,
    error character varying(255),
    resource_type character varying(64)
);


ALTER TABLE keycloak.admin_event_entity OWNER TO projecthub;

--
-- Name: associated_policy; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.associated_policy (
    policy_id character varying(36) NOT NULL,
    associated_policy_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.associated_policy OWNER TO projecthub;

--
-- Name: authentication_execution; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.authentication_execution (
    id character varying(36) NOT NULL,
    alias character varying(255),
    authenticator character varying(36),
    realm_id character varying(36),
    flow_id character varying(36),
    requirement integer,
    priority integer,
    authenticator_flow boolean DEFAULT false NOT NULL,
    auth_flow_id character varying(36),
    auth_config character varying(36)
);


ALTER TABLE keycloak.authentication_execution OWNER TO projecthub;

--
-- Name: authentication_flow; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.authentication_flow (
    id character varying(36) NOT NULL,
    alias character varying(255),
    description character varying(255),
    realm_id character varying(36),
    provider_id character varying(36) DEFAULT 'basic-flow'::character varying NOT NULL,
    top_level boolean DEFAULT false NOT NULL,
    built_in boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.authentication_flow OWNER TO projecthub;

--
-- Name: authenticator_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.authenticator_config (
    id character varying(36) NOT NULL,
    alias character varying(255),
    realm_id character varying(36)
);


ALTER TABLE keycloak.authenticator_config OWNER TO projecthub;

--
-- Name: authenticator_config_entry; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.authenticator_config_entry (
    authenticator_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.authenticator_config_entry OWNER TO projecthub;

--
-- Name: broker_link; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.broker_link (
    identity_provider character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL,
    broker_user_id character varying(255),
    broker_username character varying(255),
    token text,
    user_id character varying(255) NOT NULL
);


ALTER TABLE keycloak.broker_link OWNER TO projecthub;

--
-- Name: client; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client (
    id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    full_scope_allowed boolean DEFAULT false NOT NULL,
    client_id character varying(255),
    not_before integer,
    public_client boolean DEFAULT false NOT NULL,
    secret character varying(255),
    base_url character varying(255),
    bearer_only boolean DEFAULT false NOT NULL,
    management_url character varying(255),
    surrogate_auth_required boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    protocol character varying(255),
    node_rereg_timeout integer DEFAULT 0,
    frontchannel_logout boolean DEFAULT false NOT NULL,
    consent_required boolean DEFAULT false NOT NULL,
    name character varying(255),
    service_accounts_enabled boolean DEFAULT false NOT NULL,
    client_authenticator_type character varying(255),
    root_url character varying(255),
    description character varying(255),
    registration_token character varying(255),
    standard_flow_enabled boolean DEFAULT true NOT NULL,
    implicit_flow_enabled boolean DEFAULT false NOT NULL,
    direct_access_grants_enabled boolean DEFAULT false NOT NULL,
    always_display_in_console boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.client OWNER TO projecthub;

--
-- Name: client_attributes; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_attributes (
    client_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE keycloak.client_attributes OWNER TO projecthub;

--
-- Name: client_auth_flow_bindings; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_auth_flow_bindings (
    client_id character varying(36) NOT NULL,
    flow_id character varying(36),
    binding_name character varying(255) NOT NULL
);


ALTER TABLE keycloak.client_auth_flow_bindings OWNER TO projecthub;

--
-- Name: client_initial_access; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_initial_access (
    id character varying(36) NOT NULL,
    realm_id character varying(36) NOT NULL,
    "timestamp" integer,
    expiration integer,
    count integer,
    remaining_count integer
);


ALTER TABLE keycloak.client_initial_access OWNER TO projecthub;

--
-- Name: client_node_registrations; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_node_registrations (
    client_id character varying(36) NOT NULL,
    value integer,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.client_node_registrations OWNER TO projecthub;

--
-- Name: client_scope; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_scope (
    id character varying(36) NOT NULL,
    name character varying(255),
    realm_id character varying(36),
    description character varying(255),
    protocol character varying(255)
);


ALTER TABLE keycloak.client_scope OWNER TO projecthub;

--
-- Name: client_scope_attributes; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_scope_attributes (
    scope_id character varying(36) NOT NULL,
    value character varying(2048),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.client_scope_attributes OWNER TO projecthub;

--
-- Name: client_scope_client; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_scope_client (
    client_id character varying(255) NOT NULL,
    scope_id character varying(255) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.client_scope_client OWNER TO projecthub;

--
-- Name: client_scope_role_mapping; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_scope_role_mapping (
    scope_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_scope_role_mapping OWNER TO projecthub;

--
-- Name: client_session; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_session (
    id character varying(36) NOT NULL,
    client_id character varying(36),
    redirect_uri character varying(255),
    state character varying(255),
    "timestamp" integer,
    session_id character varying(36),
    auth_method character varying(255),
    realm_id character varying(255),
    auth_user_id character varying(36),
    current_action character varying(36)
);


ALTER TABLE keycloak.client_session OWNER TO projecthub;

--
-- Name: client_session_auth_status; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_session_auth_status (
    authenticator character varying(36) NOT NULL,
    status integer,
    client_session character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_session_auth_status OWNER TO projecthub;

--
-- Name: client_session_note; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_session_note (
    name character varying(255) NOT NULL,
    value character varying(255),
    client_session character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_session_note OWNER TO projecthub;

--
-- Name: client_session_prot_mapper; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_session_prot_mapper (
    protocol_mapper_id character varying(36) NOT NULL,
    client_session character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_session_prot_mapper OWNER TO projecthub;

--
-- Name: client_session_role; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_session_role (
    role_id character varying(255) NOT NULL,
    client_session character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_session_role OWNER TO projecthub;

--
-- Name: client_user_session_note; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.client_user_session_note (
    name character varying(255) NOT NULL,
    value character varying(2048),
    client_session character varying(36) NOT NULL
);


ALTER TABLE keycloak.client_user_session_note OWNER TO projecthub;

--
-- Name: component; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.component (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_id character varying(36),
    provider_id character varying(36),
    provider_type character varying(255),
    realm_id character varying(36),
    sub_type character varying(255)
);


ALTER TABLE keycloak.component OWNER TO projecthub;

--
-- Name: component_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.component_config (
    id character varying(36) NOT NULL,
    component_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE keycloak.component_config OWNER TO projecthub;

--
-- Name: composite_role; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.composite_role (
    composite character varying(36) NOT NULL,
    child_role character varying(36) NOT NULL
);


ALTER TABLE keycloak.composite_role OWNER TO projecthub;

--
-- Name: credential; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    user_id character varying(36),
    created_date bigint,
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE keycloak.credential OWNER TO projecthub;

--
-- Name: databasechangelog; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.databasechangelog (
    id character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    dateexecuted timestamp without time zone NOT NULL,
    orderexecuted integer NOT NULL,
    exectype character varying(10) NOT NULL,
    md5sum character varying(35),
    description character varying(255),
    comments character varying(255),
    tag character varying(255),
    liquibase character varying(20),
    contexts character varying(255),
    labels character varying(255),
    deployment_id character varying(10)
);


ALTER TABLE keycloak.databasechangelog OWNER TO projecthub;

--
-- Name: databasechangeloglock; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


ALTER TABLE keycloak.databasechangeloglock OWNER TO projecthub;

--
-- Name: default_client_scope; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.default_client_scope (
    realm_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.default_client_scope OWNER TO projecthub;

--
-- Name: event_entity; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.event_entity (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    details_json character varying(2550),
    error character varying(255),
    ip_address character varying(255),
    realm_id character varying(255),
    session_id character varying(255),
    event_time bigint,
    type character varying(255),
    user_id character varying(255),
    details_json_long_value text
);


ALTER TABLE keycloak.event_entity OWNER TO projecthub;

--
-- Name: fed_user_attribute; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_attribute (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    value character varying(2024)
);


ALTER TABLE keycloak.fed_user_attribute OWNER TO projecthub;

--
-- Name: fed_user_consent; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE keycloak.fed_user_consent OWNER TO projecthub;

--
-- Name: fed_user_consent_cl_scope; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_consent_cl_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.fed_user_consent_cl_scope OWNER TO projecthub;

--
-- Name: fed_user_credential; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    created_date bigint,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE keycloak.fed_user_credential OWNER TO projecthub;

--
-- Name: fed_user_group_membership; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE keycloak.fed_user_group_membership OWNER TO projecthub;

--
-- Name: fed_user_required_action; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_required_action (
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE keycloak.fed_user_required_action OWNER TO projecthub;

--
-- Name: fed_user_role_mapping; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.fed_user_role_mapping (
    role_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE keycloak.fed_user_role_mapping OWNER TO projecthub;

--
-- Name: federated_identity; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.federated_identity (
    identity_provider character varying(255) NOT NULL,
    realm_id character varying(36),
    federated_user_id character varying(255),
    federated_username character varying(255),
    token text,
    user_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.federated_identity OWNER TO projecthub;

--
-- Name: federated_user; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.federated_user (
    id character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.federated_user OWNER TO projecthub;

--
-- Name: group_attribute; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.group_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    group_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.group_attribute OWNER TO projecthub;

--
-- Name: group_role_mapping; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.group_role_mapping (
    role_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.group_role_mapping OWNER TO projecthub;

--
-- Name: identity_provider; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.identity_provider (
    internal_id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    provider_alias character varying(255),
    provider_id character varying(255),
    store_token boolean DEFAULT false NOT NULL,
    authenticate_by_default boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    add_token_role boolean DEFAULT true NOT NULL,
    trust_email boolean DEFAULT false NOT NULL,
    first_broker_login_flow_id character varying(36),
    post_broker_login_flow_id character varying(36),
    provider_display_name character varying(255),
    link_only boolean DEFAULT false NOT NULL
);


ALTER TABLE keycloak.identity_provider OWNER TO projecthub;

--
-- Name: identity_provider_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.identity_provider_config (
    identity_provider_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.identity_provider_config OWNER TO projecthub;

--
-- Name: identity_provider_mapper; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.identity_provider_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    idp_alias character varying(255) NOT NULL,
    idp_mapper_name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.identity_provider_mapper OWNER TO projecthub;

--
-- Name: idp_mapper_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.idp_mapper_config (
    idp_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.idp_mapper_config OWNER TO projecthub;

--
-- Name: keycloak_group; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.keycloak_group (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_group character varying(36) NOT NULL,
    realm_id character varying(36)
);


ALTER TABLE keycloak.keycloak_group OWNER TO projecthub;

--
-- Name: keycloak_role; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.keycloak_role (
    id character varying(36) NOT NULL,
    client_realm_constraint character varying(255),
    client_role boolean DEFAULT false NOT NULL,
    description character varying(255),
    name character varying(255),
    realm_id character varying(255),
    client character varying(36),
    realm character varying(36)
);


ALTER TABLE keycloak.keycloak_role OWNER TO projecthub;

--
-- Name: migration_model; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.migration_model (
    id character varying(36) NOT NULL,
    version character varying(36),
    update_time bigint DEFAULT 0 NOT NULL
);


ALTER TABLE keycloak.migration_model OWNER TO projecthub;

--
-- Name: offline_client_session; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.offline_client_session (
    user_session_id character varying(36) NOT NULL,
    client_id character varying(255) NOT NULL,
    offline_flag character varying(4) NOT NULL,
    "timestamp" integer,
    data text,
    client_storage_provider character varying(36) DEFAULT 'local'::character varying NOT NULL,
    external_client_id character varying(255) DEFAULT 'local'::character varying NOT NULL
);


ALTER TABLE keycloak.offline_client_session OWNER TO projecthub;

--
-- Name: offline_user_session; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.offline_user_session (
    user_session_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    created_on integer NOT NULL,
    offline_flag character varying(4) NOT NULL,
    data text,
    last_session_refresh integer DEFAULT 0 NOT NULL
);


ALTER TABLE keycloak.offline_user_session OWNER TO projecthub;

--
-- Name: policy_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.policy_config (
    policy_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE keycloak.policy_config OWNER TO projecthub;

--
-- Name: protocol_mapper; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.protocol_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    protocol character varying(255) NOT NULL,
    protocol_mapper_name character varying(255) NOT NULL,
    client_id character varying(36),
    client_scope_id character varying(36)
);


ALTER TABLE keycloak.protocol_mapper OWNER TO projecthub;

--
-- Name: protocol_mapper_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.protocol_mapper_config (
    protocol_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.protocol_mapper_config OWNER TO projecthub;

--
-- Name: realm; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm (
    id character varying(36) NOT NULL,
    access_code_lifespan integer,
    user_action_lifespan integer,
    access_token_lifespan integer,
    account_theme character varying(255),
    admin_theme character varying(255),
    email_theme character varying(255),
    enabled boolean DEFAULT false NOT NULL,
    events_enabled boolean DEFAULT false NOT NULL,
    events_expiration bigint,
    login_theme character varying(255),
    name character varying(255),
    not_before integer,
    password_policy character varying(2550),
    registration_allowed boolean DEFAULT false NOT NULL,
    remember_me boolean DEFAULT false NOT NULL,
    reset_password_allowed boolean DEFAULT false NOT NULL,
    social boolean DEFAULT false NOT NULL,
    ssl_required character varying(255),
    sso_idle_timeout integer,
    sso_max_lifespan integer,
    update_profile_on_soc_login boolean DEFAULT false NOT NULL,
    verify_email boolean DEFAULT false NOT NULL,
    master_admin_client character varying(36),
    login_lifespan integer,
    internationalization_enabled boolean DEFAULT false NOT NULL,
    default_locale character varying(255),
    reg_email_as_username boolean DEFAULT false NOT NULL,
    admin_events_enabled boolean DEFAULT false NOT NULL,
    admin_events_details_enabled boolean DEFAULT false NOT NULL,
    edit_username_allowed boolean DEFAULT false NOT NULL,
    otp_policy_counter integer DEFAULT 0,
    otp_policy_window integer DEFAULT 1,
    otp_policy_period integer DEFAULT 30,
    otp_policy_digits integer DEFAULT 6,
    otp_policy_alg character varying(36) DEFAULT 'HmacSHA1'::character varying,
    otp_policy_type character varying(36) DEFAULT 'totp'::character varying,
    browser_flow character varying(36),
    registration_flow character varying(36),
    direct_grant_flow character varying(36),
    reset_credentials_flow character varying(36),
    client_auth_flow character varying(36),
    offline_session_idle_timeout integer DEFAULT 0,
    revoke_refresh_token boolean DEFAULT false NOT NULL,
    access_token_life_implicit integer DEFAULT 0,
    login_with_email_allowed boolean DEFAULT true NOT NULL,
    duplicate_emails_allowed boolean DEFAULT false NOT NULL,
    docker_auth_flow character varying(36),
    refresh_token_max_reuse integer DEFAULT 0,
    allow_user_managed_access boolean DEFAULT false NOT NULL,
    sso_max_lifespan_remember_me integer DEFAULT 0 NOT NULL,
    sso_idle_timeout_remember_me integer DEFAULT 0 NOT NULL,
    default_role character varying(255)
);


ALTER TABLE keycloak.realm OWNER TO projecthub;

--
-- Name: realm_attribute; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_attribute (
    name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    value text
);


ALTER TABLE keycloak.realm_attribute OWNER TO projecthub;

--
-- Name: realm_default_groups; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_default_groups (
    realm_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.realm_default_groups OWNER TO projecthub;

--
-- Name: realm_enabled_event_types; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_enabled_event_types (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_enabled_event_types OWNER TO projecthub;

--
-- Name: realm_events_listeners; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_events_listeners (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_events_listeners OWNER TO projecthub;

--
-- Name: realm_localizations; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_localizations (
    realm_id character varying(255) NOT NULL,
    locale character varying(255) NOT NULL,
    texts text NOT NULL
);


ALTER TABLE keycloak.realm_localizations OWNER TO projecthub;

--
-- Name: realm_required_credential; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_required_credential (
    type character varying(255) NOT NULL,
    form_label character varying(255),
    input boolean DEFAULT false NOT NULL,
    secret boolean DEFAULT false NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.realm_required_credential OWNER TO projecthub;

--
-- Name: realm_smtp_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_smtp_config (
    realm_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_smtp_config OWNER TO projecthub;

--
-- Name: realm_supported_locales; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.realm_supported_locales (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.realm_supported_locales OWNER TO projecthub;

--
-- Name: redirect_uris; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.redirect_uris (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.redirect_uris OWNER TO projecthub;

--
-- Name: required_action_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.required_action_config (
    required_action_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.required_action_config OWNER TO projecthub;

--
-- Name: required_action_provider; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.required_action_provider (
    id character varying(36) NOT NULL,
    alias character varying(255),
    name character varying(255),
    realm_id character varying(36),
    enabled boolean DEFAULT false NOT NULL,
    default_action boolean DEFAULT false NOT NULL,
    provider_id character varying(255),
    priority integer
);


ALTER TABLE keycloak.required_action_provider OWNER TO projecthub;

--
-- Name: resource_attribute; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    resource_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.resource_attribute OWNER TO projecthub;

--
-- Name: resource_policy; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_policy (
    resource_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.resource_policy OWNER TO projecthub;

--
-- Name: resource_scope; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_scope (
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.resource_scope OWNER TO projecthub;

--
-- Name: resource_server; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_server (
    id character varying(36) NOT NULL,
    allow_rs_remote_mgmt boolean DEFAULT false NOT NULL,
    policy_enforce_mode smallint NOT NULL,
    decision_strategy smallint DEFAULT 1 NOT NULL
);


ALTER TABLE keycloak.resource_server OWNER TO projecthub;

--
-- Name: resource_server_perm_ticket; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_server_perm_ticket (
    id character varying(36) NOT NULL,
    owner character varying(255) NOT NULL,
    requester character varying(255) NOT NULL,
    created_timestamp bigint NOT NULL,
    granted_timestamp bigint,
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36),
    resource_server_id character varying(36) NOT NULL,
    policy_id character varying(36)
);


ALTER TABLE keycloak.resource_server_perm_ticket OWNER TO projecthub;

--
-- Name: resource_server_policy; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_server_policy (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    type character varying(255) NOT NULL,
    decision_strategy smallint,
    logic smallint,
    resource_server_id character varying(36) NOT NULL,
    owner character varying(255)
);


ALTER TABLE keycloak.resource_server_policy OWNER TO projecthub;

--
-- Name: resource_server_resource; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_server_resource (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255),
    icon_uri character varying(255),
    owner character varying(255) NOT NULL,
    resource_server_id character varying(36) NOT NULL,
    owner_managed_access boolean DEFAULT false NOT NULL,
    display_name character varying(255)
);


ALTER TABLE keycloak.resource_server_resource OWNER TO projecthub;

--
-- Name: resource_server_scope; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_server_scope (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    icon_uri character varying(255),
    resource_server_id character varying(36) NOT NULL,
    display_name character varying(255)
);


ALTER TABLE keycloak.resource_server_scope OWNER TO projecthub;

--
-- Name: resource_uris; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.resource_uris (
    resource_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.resource_uris OWNER TO projecthub;

--
-- Name: role_attribute; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.role_attribute (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255)
);


ALTER TABLE keycloak.role_attribute OWNER TO projecthub;

--
-- Name: scope_mapping; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.scope_mapping (
    client_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.scope_mapping OWNER TO projecthub;

--
-- Name: scope_policy; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.scope_policy (
    scope_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.scope_policy OWNER TO projecthub;

--
-- Name: user_attribute; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_attribute (
    name character varying(255) NOT NULL,
    value character varying(255),
    user_id character varying(36) NOT NULL,
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL
);


ALTER TABLE keycloak.user_attribute OWNER TO projecthub;

--
-- Name: user_consent; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(36) NOT NULL,
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE keycloak.user_consent OWNER TO projecthub;

--
-- Name: user_consent_client_scope; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_consent_client_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_consent_client_scope OWNER TO projecthub;

--
-- Name: user_entity; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_entity (
    id character varying(36) NOT NULL,
    email character varying(255),
    email_constraint character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    federation_link character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    realm_id character varying(255),
    username character varying(255),
    created_timestamp bigint,
    service_account_client_link character varying(255),
    not_before integer DEFAULT 0 NOT NULL
);


ALTER TABLE keycloak.user_entity OWNER TO projecthub;

--
-- Name: user_federation_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_federation_config (
    user_federation_provider_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.user_federation_config OWNER TO projecthub;

--
-- Name: user_federation_mapper; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_federation_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    federation_provider_id character varying(36) NOT NULL,
    federation_mapper_type character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_federation_mapper OWNER TO projecthub;

--
-- Name: user_federation_mapper_config; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_federation_mapper_config (
    user_federation_mapper_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE keycloak.user_federation_mapper_config OWNER TO projecthub;

--
-- Name: user_federation_provider; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_federation_provider (
    id character varying(36) NOT NULL,
    changed_sync_period integer,
    display_name character varying(255),
    full_sync_period integer,
    last_sync integer,
    priority integer,
    provider_name character varying(255),
    realm_id character varying(36)
);


ALTER TABLE keycloak.user_federation_provider OWNER TO projecthub;

--
-- Name: user_group_membership; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_group_membership OWNER TO projecthub;

--
-- Name: user_required_action; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_required_action (
    user_id character varying(36) NOT NULL,
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL
);


ALTER TABLE keycloak.user_required_action OWNER TO projecthub;

--
-- Name: user_role_mapping; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_role_mapping (
    role_id character varying(255) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE keycloak.user_role_mapping OWNER TO projecthub;

--
-- Name: user_session; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_session (
    id character varying(36) NOT NULL,
    auth_method character varying(255),
    ip_address character varying(255),
    last_session_refresh integer,
    login_username character varying(255),
    realm_id character varying(255),
    remember_me boolean DEFAULT false NOT NULL,
    started integer,
    user_id character varying(255),
    user_session_state integer,
    broker_session_id character varying(255),
    broker_user_id character varying(255)
);


ALTER TABLE keycloak.user_session OWNER TO projecthub;

--
-- Name: user_session_note; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.user_session_note (
    user_session character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(2048)
);


ALTER TABLE keycloak.user_session_note OWNER TO projecthub;

--
-- Name: username_login_failure; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.username_login_failure (
    realm_id character varying(36) NOT NULL,
    username character varying(255) NOT NULL,
    failed_login_not_before integer,
    last_failure bigint,
    last_ip_failure character varying(255),
    num_failures integer
);


ALTER TABLE keycloak.username_login_failure OWNER TO projecthub;

--
-- Name: web_origins; Type: TABLE; Schema: keycloak; Owner: projecthub
--

CREATE TABLE keycloak.web_origins (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE keycloak.web_origins OWNER TO projecthub;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    actor_id uuid,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    entity_name character varying(500),
    ip_address inet,
    user_agent text,
    changes jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO projecthub;

--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.auth_group OWNER TO projecthub;

--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_group_permissions OWNER TO projecthub;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


ALTER TABLE public.auth_permission OWNER TO projecthub;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.auth_user (
    id integer NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    username character varying(150) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    email character varying(254) NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL
);


ALTER TABLE public.auth_user OWNER TO projecthub;

--
-- Name: auth_user_groups; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.auth_user_groups (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL
);


ALTER TABLE public.auth_user_groups OWNER TO projecthub;

--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.auth_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.auth_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user_user_permissions; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.auth_user_user_permissions (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_user_user_permissions OWNER TO projecthub;

--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.auth_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cpm_baselines; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.cpm_baselines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) DEFAULT 'Baseline Original'::character varying NOT NULL,
    snapshot jsonb NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cpm_baselines OWNER TO projecthub;

--
-- Name: cpm_issue_data; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.cpm_issue_data (
    issue_id uuid NOT NULL,
    duration_days integer DEFAULT 1 NOT NULL,
    es integer DEFAULT 0 NOT NULL,
    ef integer DEFAULT 1 NOT NULL,
    ls integer DEFAULT 0 NOT NULL,
    lf integer DEFAULT 1 NOT NULL,
    slack integer DEFAULT 0 NOT NULL,
    is_critical boolean DEFAULT false NOT NULL,
    calculated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cpm_issue_data_duration_days_check CHECK ((duration_days > 0))
);


ALTER TABLE public.cpm_issue_data OWNER TO projecthub;

--
-- Name: cycle_issues; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.cycle_issues (
    cycle_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.cycle_issues OWNER TO projecthub;

--
-- Name: cycles; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    start_date date,
    end_date date,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cycles_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.cycles OWNER TO projecthub;

--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id integer NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


ALTER TABLE public.django_admin_log OWNER TO projecthub;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_beat_clockedschedule; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_beat_clockedschedule (
    id integer NOT NULL,
    clocked_time timestamp with time zone NOT NULL
);


ALTER TABLE public.django_celery_beat_clockedschedule OWNER TO projecthub;

--
-- Name: django_celery_beat_clockedschedule_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_beat_clockedschedule ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_beat_clockedschedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_beat_crontabschedule; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_beat_crontabschedule (
    id integer NOT NULL,
    minute character varying(240) NOT NULL,
    hour character varying(96) NOT NULL,
    day_of_week character varying(64) NOT NULL,
    day_of_month character varying(124) NOT NULL,
    month_of_year character varying(64) NOT NULL,
    timezone character varying(63) NOT NULL
);


ALTER TABLE public.django_celery_beat_crontabschedule OWNER TO projecthub;

--
-- Name: django_celery_beat_crontabschedule_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_beat_crontabschedule ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_beat_crontabschedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_beat_intervalschedule; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_beat_intervalschedule (
    id integer NOT NULL,
    every integer NOT NULL,
    period character varying(24) NOT NULL
);


ALTER TABLE public.django_celery_beat_intervalschedule OWNER TO projecthub;

--
-- Name: django_celery_beat_intervalschedule_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_beat_intervalschedule ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_beat_intervalschedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_beat_periodictask; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_beat_periodictask (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    task character varying(200) NOT NULL,
    args text NOT NULL,
    kwargs text NOT NULL,
    queue character varying(200),
    exchange character varying(200),
    routing_key character varying(200),
    expires timestamp with time zone,
    enabled boolean NOT NULL,
    last_run_at timestamp with time zone,
    total_run_count integer NOT NULL,
    date_changed timestamp with time zone NOT NULL,
    description text NOT NULL,
    crontab_id integer,
    interval_id integer,
    solar_id integer,
    one_off boolean NOT NULL,
    start_time timestamp with time zone,
    priority integer,
    headers text NOT NULL,
    clocked_id integer,
    expire_seconds integer,
    CONSTRAINT django_celery_beat_periodictask_expire_seconds_check CHECK ((expire_seconds >= 0)),
    CONSTRAINT django_celery_beat_periodictask_priority_check CHECK ((priority >= 0)),
    CONSTRAINT django_celery_beat_periodictask_total_run_count_check CHECK ((total_run_count >= 0))
);


ALTER TABLE public.django_celery_beat_periodictask OWNER TO projecthub;

--
-- Name: django_celery_beat_periodictask_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_beat_periodictask ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_beat_periodictask_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_beat_periodictasks; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_beat_periodictasks (
    ident smallint NOT NULL,
    last_update timestamp with time zone NOT NULL
);


ALTER TABLE public.django_celery_beat_periodictasks OWNER TO projecthub;

--
-- Name: django_celery_beat_solarschedule; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_beat_solarschedule (
    id integer NOT NULL,
    event character varying(24) NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL
);


ALTER TABLE public.django_celery_beat_solarschedule OWNER TO projecthub;

--
-- Name: django_celery_beat_solarschedule_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_beat_solarschedule ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_beat_solarschedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_results_chordcounter; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_results_chordcounter (
    id integer NOT NULL,
    group_id character varying(255) NOT NULL,
    sub_tasks text NOT NULL,
    count integer NOT NULL,
    CONSTRAINT django_celery_results_chordcounter_count_check CHECK ((count >= 0))
);


ALTER TABLE public.django_celery_results_chordcounter OWNER TO projecthub;

--
-- Name: django_celery_results_chordcounter_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_results_chordcounter ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_results_chordcounter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_results_groupresult; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_results_groupresult (
    id integer NOT NULL,
    group_id character varying(255) NOT NULL,
    date_created timestamp with time zone NOT NULL,
    date_done timestamp with time zone NOT NULL,
    content_type character varying(128) NOT NULL,
    content_encoding character varying(64) NOT NULL,
    result text
);


ALTER TABLE public.django_celery_results_groupresult OWNER TO projecthub;

--
-- Name: django_celery_results_groupresult_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_results_groupresult ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_results_groupresult_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_celery_results_taskresult; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_celery_results_taskresult (
    id integer NOT NULL,
    task_id character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    content_type character varying(128) NOT NULL,
    content_encoding character varying(64) NOT NULL,
    result text,
    date_done timestamp with time zone NOT NULL,
    traceback text,
    meta text,
    task_args text,
    task_kwargs text,
    task_name character varying(255),
    worker character varying(100),
    date_created timestamp with time zone NOT NULL,
    periodic_task_name character varying(255)
);


ALTER TABLE public.django_celery_results_taskresult OWNER TO projecthub;

--
-- Name: django_celery_results_taskresult_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_celery_results_taskresult ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_celery_results_taskresult_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


ALTER TABLE public.django_content_type OWNER TO projecthub;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


ALTER TABLE public.django_migrations OWNER TO projecthub;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


ALTER TABLE public.django_session OWNER TO projecthub;

--
-- Name: health_check_db_testmodel; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.health_check_db_testmodel (
    id integer NOT NULL,
    title character varying(128) NOT NULL
);


ALTER TABLE public.health_check_db_testmodel OWNER TO projecthub;

--
-- Name: health_check_db_testmodel_id_seq; Type: SEQUENCE; Schema: public; Owner: projecthub
--

ALTER TABLE public.health_check_db_testmodel ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.health_check_db_testmodel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: issue_activities; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issue_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    actor_id uuid,
    activity_type character varying(50) NOT NULL,
    field character varying(100),
    old_value text,
    new_value text,
    old_identifier character varying(255),
    new_identifier character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issue_activities OWNER TO projecthub;

--
-- Name: issue_attachments; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issue_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    storage_path character varying(1000) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issue_attachments OWNER TO projecthub;

--
-- Name: issue_comments; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issue_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content jsonb NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issue_comments OWNER TO projecthub;

--
-- Name: issue_labels; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issue_labels (
    issue_id uuid NOT NULL,
    label_id uuid NOT NULL
);


ALTER TABLE public.issue_labels OWNER TO projecthub;

--
-- Name: issue_relations; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issue_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    related_id uuid NOT NULL,
    relation_type character varying(30) NOT NULL,
    lag_days integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT issue_relations_relation_type_check CHECK (((relation_type)::text = ANY ((ARRAY['blocks'::character varying, 'blocked_by'::character varying, 'duplicates'::character varying, 'duplicate_of'::character varying, 'relates_to'::character varying, 'finish_to_start'::character varying, 'start_to_start'::character varying, 'finish_to_finish'::character varying])::text[])))
);


ALTER TABLE public.issue_relations OWNER TO projecthub;

--
-- Name: issue_states; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issue_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#6B7280'::character varying NOT NULL,
    category character varying(20) NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT issue_states_category_check CHECK (((category)::text = ANY ((ARRAY['backlog'::character varying, 'unstarted'::character varying, 'started'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.issue_states OWNER TO projecthub;

--
-- Name: issues; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    sequence_id integer NOT NULL,
    title character varying(500) NOT NULL,
    description jsonb,
    state_id uuid,
    priority character varying(20) DEFAULT 'none'::character varying NOT NULL,
    type character varying(20) DEFAULT 'task'::character varying NOT NULL,
    assignee_id uuid,
    reporter_id uuid,
    parent_id uuid,
    epic_id uuid,
    estimate_points integer,
    due_date date,
    start_date date,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    sort_order double precision DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    size character varying(5),
    estimate_days double precision,
    milestone_id uuid,
    color character varying(7),
    CONSTRAINT issues_priority_check CHECK (((priority)::text = ANY ((ARRAY['urgent'::character varying, 'high'::character varying, 'medium'::character varying, 'low'::character varying, 'none'::character varying])::text[]))),
    CONSTRAINT issues_size_check CHECK (((size)::text = ANY ((ARRAY['xs'::character varying, 's'::character varying, 'm'::character varying, 'l'::character varying, 'xl'::character varying])::text[]))),
    CONSTRAINT issues_type_check CHECK (((type)::text = ANY ((ARRAY['task'::character varying, 'bug'::character varying, 'story'::character varying, 'epic'::character varying, 'subtask'::character varying])::text[])))
);


ALTER TABLE public.issues OWNER TO projecthub;

--
-- Name: labels; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#6B7280'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.labels OWNER TO projecthub;

--
-- Name: member_capacities; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.member_capacities (
    id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    available_days numeric(5,1) NOT NULL,
    note text,
    member_id uuid NOT NULL,
    CONSTRAINT member_capacity_available_days_non_negative CHECK ((available_days >= (0)::numeric)),
    CONSTRAINT member_capacity_month_1_12 CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.member_capacities OWNER TO projecthub;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    due_date date,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT milestones_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reached'::character varying, 'missed'::character varying])::text[])))
);


ALTER TABLE public.milestones OWNER TO projecthub;

--
-- Name: module_issues; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.module_issues (
    module_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.module_issues OWNER TO projecthub;

--
-- Name: modules; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    lead_id uuid,
    start_date date,
    target_date date,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT modules_status_check CHECK (((status)::text = ANY ((ARRAY['backlog'::character varying, 'in_progress'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.modules OWNER TO projecthub;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    actor_id uuid,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    entity_type character varying(30),
    entity_id uuid,
    action_url character varying(500),
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO projecthub;

--
-- Name: objective_projects; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.objective_projects (
    objective_id uuid NOT NULL,
    project_id uuid NOT NULL,
    weight numeric(5,2) DEFAULT 1.0 NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT objective_projects_weight_check CHECK ((weight > (0)::numeric))
);


ALTER TABLE public.objective_projects OWNER TO projecthub;

--
-- Name: portfolio_cost_entries; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.portfolio_cost_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_project_id uuid NOT NULL,
    description character varying(500) NOT NULL,
    amount numeric(15,2) NOT NULL,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    category character varying(50) DEFAULT 'other'::character varying NOT NULL,
    registered_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT portfolio_cost_entries_category_check CHECK (((category)::text = ANY ((ARRAY['labor'::character varying, 'infrastructure'::character varying, 'licenses'::character varying, 'services'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.portfolio_cost_entries OWNER TO projecthub;

--
-- Name: portfolio_objectives; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.portfolio_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    target_value numeric DEFAULT 100 NOT NULL,
    current_value numeric DEFAULT 0 NOT NULL,
    unit character varying(50) DEFAULT '%'::character varying NOT NULL,
    due_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolio_objectives OWNER TO projecthub;

--
-- Name: portfolio_project_deps; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.portfolio_project_deps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    predecessor_id uuid NOT NULL,
    successor_id uuid NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolio_project_deps OWNER TO projecthub;

--
-- Name: portfolio_projects; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.portfolio_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    project_id uuid NOT NULL,
    start_date date,
    end_date date,
    budget_planned numeric(15,2) DEFAULT 0 NOT NULL,
    budget_actual numeric(15,2) DEFAULT 0 NOT NULL,
    rag_status character varying(10) DEFAULT 'GREEN'::character varying NOT NULL,
    rag_override boolean DEFAULT false NOT NULL,
    rag_note text,
    "position" integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT portfolio_projects_rag_status_check CHECK (((rag_status)::text = ANY ((ARRAY['GREEN'::character varying, 'AMBER'::character varying, 'RED'::character varying])::text[])))
);


ALTER TABLE public.portfolio_projects OWNER TO projecthub;

--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    owner_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolios OWNER TO projecthub;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    member_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid(),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_members_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.project_members OWNER TO projecthub;

--
-- Name: project_risks; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.project_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(50) DEFAULT 'technical'::character varying NOT NULL,
    probability smallint NOT NULL,
    impact smallint NOT NULL,
    score smallint NOT NULL,
    status character varying(20) DEFAULT 'identified'::character varying NOT NULL,
    response_type character varying(20),
    owner_id uuid,
    mitigation_plan text,
    contingency_plan text,
    due_date date,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_risks_impact_check CHECK (((impact >= 1) AND (impact <= 5))),
    CONSTRAINT project_risks_probability_check CHECK (((probability >= 1) AND (probability <= 5)))
);


ALTER TABLE public.project_risks OWNER TO projecthub;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    identifier character varying(10) NOT NULL,
    description text,
    icon character varying(10),
    color character varying(7),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO projecthub;

--
-- Name: resource_profiles; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.resource_profiles (
    id uuid NOT NULL,
    daily_rate_brl numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    member_id uuid NOT NULL,
    project_id uuid NOT NULL
);


ALTER TABLE public.resource_profiles OWNER TO projecthub;

--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.time_entries (
    id uuid NOT NULL,
    date date NOT NULL,
    hours numeric(5,2) NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL,
    issue_id uuid NOT NULL,
    member_id uuid NOT NULL
);


ALTER TABLE public.time_entries OWNER TO projecthub;

--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.workspace_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    keycloak_sub character varying(255) NOT NULL,
    name character varying(255),
    email character varying(255),
    avatar_url character varying(500),
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    joined_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_members_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying, 'guest'::character varying])::text[])))
);


ALTER TABLE public.workspace_members OWNER TO projecthub;

--
-- Name: v_issues_summary; Type: VIEW; Schema: public; Owner: projecthub
--

CREATE VIEW public.v_issues_summary AS
 SELECT i.id,
    i.project_id,
    p.name AS project_name,
    p.identifier AS project_identifier,
    i.sequence_id,
    (((p.identifier)::text || '-'::text) || i.sequence_id) AS issue_key,
    i.title,
    i.priority,
    i.type,
    s.name AS state_name,
    s.color AS state_color,
    s.category AS state_category,
    a.name AS assignee_name,
    a.email AS assignee_email,
    i.due_date,
    i.estimate_points,
    i.created_at,
    i.updated_at,
    i.completed_at,
    cpm.is_critical,
    cpm.slack AS cpm_slack,
    cpm.duration_days
   FROM ((((public.issues i
     JOIN public.projects p ON ((p.id = i.project_id)))
     LEFT JOIN public.issue_states s ON ((s.id = i.state_id)))
     LEFT JOIN public.workspace_members a ON ((a.id = i.assignee_id)))
     LEFT JOIN public.cpm_issue_data cpm ON ((cpm.issue_id = i.id)));


ALTER VIEW public.v_issues_summary OWNER TO projecthub;

--
-- Name: v_portfolio_evm; Type: VIEW; Schema: public; Owner: projecthub
--

CREATE VIEW public.v_portfolio_evm AS
 SELECT pp.id AS portfolio_project_id,
    pp.portfolio_id,
    p.name AS project_name,
    p.identifier,
    pp.start_date,
    pp.end_date,
    pp.budget_planned,
    pp.budget_actual,
    pp.rag_status,
        CASE
            WHEN ((pp.end_date IS NULL) OR (pp.start_date IS NULL)) THEN (0)::numeric
            ELSE round(((EXTRACT(day FROM (now() - ((pp.start_date)::timestamp without time zone)::timestamp with time zone)) / NULLIF(EXTRACT(day FROM ((pp.end_date)::timestamp without time zone - (pp.start_date)::timestamp without time zone)), (0)::numeric)) * (100)::numeric), 1)
        END AS pct_time_elapsed,
    round((((count(i.id) FILTER (WHERE ((s.category)::text = 'completed'::text)))::numeric / (NULLIF(count(i.id), 0))::numeric) * (100)::numeric), 1) AS pct_issues_completed,
    count(i.id) AS total_issues,
    count(i.id) FILTER (WHERE ((s.category)::text = 'completed'::text)) AS completed_issues,
    count(i.id) FILTER (WHERE ((s.category)::text = ANY ((ARRAY['started'::character varying, 'unstarted'::character varying])::text[]))) AS open_issues
   FROM (((public.portfolio_projects pp
     JOIN public.projects p ON ((p.id = pp.project_id)))
     LEFT JOIN public.issues i ON ((i.project_id = p.id)))
     LEFT JOIN public.issue_states s ON ((s.id = i.state_id)))
  GROUP BY pp.id, pp.portfolio_id, p.name, p.identifier, pp.start_date, pp.end_date, pp.budget_planned, pp.budget_actual, pp.rag_status;


ALTER VIEW public.v_portfolio_evm OWNER TO projecthub;

--
-- Name: wiki_issue_links; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.wiki_issue_links (
    page_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    link_type character varying(30) DEFAULT 'related'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT wiki_issue_links_link_type_check CHECK (((link_type)::text = ANY ((ARRAY['spec'::character varying, 'runbook'::character varying, 'postmortem'::character varying, 'decision'::character varying, 'related'::character varying])::text[])))
);


ALTER TABLE public.wiki_issue_links OWNER TO projecthub;

--
-- Name: wiki_page_comments; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.wiki_page_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    selection_text text,
    resolved boolean DEFAULT false NOT NULL,
    resolved_by uuid,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wiki_page_comments OWNER TO projecthub;

--
-- Name: wiki_page_versions; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.wiki_page_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    title character varying(500),
    content jsonb,
    version integer NOT NULL,
    change_summary character varying(255),
    saved_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    yjs_state bytea
);


ALTER TABLE public.wiki_page_versions OWNER TO projecthub;

--
-- Name: wiki_pages; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.wiki_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid NOT NULL,
    parent_id uuid,
    title character varying(500) DEFAULT 'Página sem título'::character varying NOT NULL,
    content jsonb,
    emoji character varying(10),
    cover_url character varying(500),
    is_locked boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_token character varying(64),
    "position" double precision DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    word_count integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    yjs_state bytea
);


ALTER TABLE public.wiki_pages OWNER TO projecthub;

--
-- Name: wiki_spaces; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.wiki_spaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    project_id uuid,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(10),
    color character varying(7),
    is_private boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wiki_spaces OWNER TO projecthub;

--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: projecthub
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    logo_url character varying(500),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspaces OWNER TO projecthub;

--
-- Data for Name: admin_event_entity; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.admin_event_entity (id, admin_event_time, realm_id, operation_type, auth_realm_id, auth_client_id, auth_user_id, ip_address, resource_path, representation, error, resource_type) FROM stdin;
\.


--
-- Data for Name: associated_policy; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.associated_policy (policy_id, associated_policy_id) FROM stdin;
\.


--
-- Data for Name: authentication_execution; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.authentication_execution (id, alias, authenticator, realm_id, flow_id, requirement, priority, authenticator_flow, auth_flow_id, auth_config) FROM stdin;
cfe9ba42-aacf-4fec-8440-e0dc266d455f	\N	auth-cookie	81ce423f-6d27-457d-908e-6ad3e5d50ea2	4ba39979-6543-4b27-ad49-939717a02ada	2	10	f	\N	\N
d707a167-b3fe-49be-8dc2-aded869269d4	\N	auth-spnego	81ce423f-6d27-457d-908e-6ad3e5d50ea2	4ba39979-6543-4b27-ad49-939717a02ada	3	20	f	\N	\N
095979a8-bc27-4379-ac3d-364f20ad795f	\N	identity-provider-redirector	81ce423f-6d27-457d-908e-6ad3e5d50ea2	4ba39979-6543-4b27-ad49-939717a02ada	2	25	f	\N	\N
57c7362b-07b6-48d7-9880-b63668da6a15	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	4ba39979-6543-4b27-ad49-939717a02ada	2	30	t	6a6996ab-2c03-4458-8c8a-4561ada44254	\N
761d2b69-f36b-43c9-8ed4-92ab8be416fb	\N	auth-username-password-form	81ce423f-6d27-457d-908e-6ad3e5d50ea2	6a6996ab-2c03-4458-8c8a-4561ada44254	0	10	f	\N	\N
b4908832-f48d-488e-a088-d11a356a2f00	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	6a6996ab-2c03-4458-8c8a-4561ada44254	1	20	t	20f51944-9d49-4a4c-b256-15cf1a09ad24	\N
0b3ad208-589a-477e-a13b-ee02f24a8e48	\N	conditional-user-configured	81ce423f-6d27-457d-908e-6ad3e5d50ea2	20f51944-9d49-4a4c-b256-15cf1a09ad24	0	10	f	\N	\N
358b6c04-55c7-42ac-9578-fd01bd089aaa	\N	auth-otp-form	81ce423f-6d27-457d-908e-6ad3e5d50ea2	20f51944-9d49-4a4c-b256-15cf1a09ad24	0	20	f	\N	\N
152e57f5-951d-4259-ba33-bfe74fc2cb31	\N	direct-grant-validate-username	81ce423f-6d27-457d-908e-6ad3e5d50ea2	695e6ecb-0fbc-4630-af27-b53520bcbbe5	0	10	f	\N	\N
53ca42d5-e933-42b9-b7a0-bf50a4b0ef9a	\N	direct-grant-validate-password	81ce423f-6d27-457d-908e-6ad3e5d50ea2	695e6ecb-0fbc-4630-af27-b53520bcbbe5	0	20	f	\N	\N
786c91bd-e9e6-4544-8789-a21165d5f477	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	695e6ecb-0fbc-4630-af27-b53520bcbbe5	1	30	t	c289a819-4f8f-42ea-8e6b-9def4cd6f647	\N
6b139dbe-b224-49a6-ae14-ef41e2c77bd4	\N	conditional-user-configured	81ce423f-6d27-457d-908e-6ad3e5d50ea2	c289a819-4f8f-42ea-8e6b-9def4cd6f647	0	10	f	\N	\N
f684491e-b03b-41fa-bfd9-1c0e209f408f	\N	direct-grant-validate-otp	81ce423f-6d27-457d-908e-6ad3e5d50ea2	c289a819-4f8f-42ea-8e6b-9def4cd6f647	0	20	f	\N	\N
4ed205e4-af90-4fff-9560-9f06a41b0df6	\N	registration-page-form	81ce423f-6d27-457d-908e-6ad3e5d50ea2	cc8a7a03-4bbb-44d7-9b56-d6b4dc5c5903	0	10	t	ee6054a6-e7a0-4952-ac9e-a2cc85650558	\N
d29ba768-004f-46bd-b1cb-b4dbd9322df0	\N	registration-user-creation	81ce423f-6d27-457d-908e-6ad3e5d50ea2	ee6054a6-e7a0-4952-ac9e-a2cc85650558	0	20	f	\N	\N
3ec21fe0-bc07-4ac1-b5d3-893a2ddf1b08	\N	registration-password-action	81ce423f-6d27-457d-908e-6ad3e5d50ea2	ee6054a6-e7a0-4952-ac9e-a2cc85650558	0	50	f	\N	\N
4ead0d5e-07da-4ae9-982c-68ff8c49490d	\N	registration-recaptcha-action	81ce423f-6d27-457d-908e-6ad3e5d50ea2	ee6054a6-e7a0-4952-ac9e-a2cc85650558	3	60	f	\N	\N
a81bcdf7-8c88-404f-b95c-c0a1631c30a8	\N	registration-terms-and-conditions	81ce423f-6d27-457d-908e-6ad3e5d50ea2	ee6054a6-e7a0-4952-ac9e-a2cc85650558	3	70	f	\N	\N
232beb88-7743-404d-a6c7-0a49f830cf35	\N	reset-credentials-choose-user	81ce423f-6d27-457d-908e-6ad3e5d50ea2	e051a36e-f974-4422-a565-3f8e63d5294f	0	10	f	\N	\N
26c8bf76-5ef3-4172-a651-8dd42251cac8	\N	reset-credential-email	81ce423f-6d27-457d-908e-6ad3e5d50ea2	e051a36e-f974-4422-a565-3f8e63d5294f	0	20	f	\N	\N
1b53c975-731f-4e36-a301-2069b2224a26	\N	reset-password	81ce423f-6d27-457d-908e-6ad3e5d50ea2	e051a36e-f974-4422-a565-3f8e63d5294f	0	30	f	\N	\N
99880c93-ed55-40d7-b046-46ccf9795aff	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	e051a36e-f974-4422-a565-3f8e63d5294f	1	40	t	b0db9685-46fd-4406-93e8-f7ca45bf61f7	\N
0c888e0d-3f1e-47c8-a51f-229a55ee1f72	\N	conditional-user-configured	81ce423f-6d27-457d-908e-6ad3e5d50ea2	b0db9685-46fd-4406-93e8-f7ca45bf61f7	0	10	f	\N	\N
3caff38a-a0d0-468f-8fc1-d172827c8903	\N	reset-otp	81ce423f-6d27-457d-908e-6ad3e5d50ea2	b0db9685-46fd-4406-93e8-f7ca45bf61f7	0	20	f	\N	\N
28ee27c7-c0de-4639-ae6a-30de12ceef4a	\N	client-secret	81ce423f-6d27-457d-908e-6ad3e5d50ea2	c9968038-99ee-4c38-a81e-4d110f7f239b	2	10	f	\N	\N
549b333c-ffdb-46fe-b348-316da7cd72ac	\N	client-jwt	81ce423f-6d27-457d-908e-6ad3e5d50ea2	c9968038-99ee-4c38-a81e-4d110f7f239b	2	20	f	\N	\N
dbd61811-508a-454a-9eb4-61337803c6b9	\N	client-secret-jwt	81ce423f-6d27-457d-908e-6ad3e5d50ea2	c9968038-99ee-4c38-a81e-4d110f7f239b	2	30	f	\N	\N
45cec49c-ce1e-4592-aeb6-ac22a517421b	\N	client-x509	81ce423f-6d27-457d-908e-6ad3e5d50ea2	c9968038-99ee-4c38-a81e-4d110f7f239b	2	40	f	\N	\N
3279ab1a-31e7-4fc9-8b4a-7e7fb07617fc	\N	idp-review-profile	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f7e6e35a-657f-49cd-adec-3848910187bd	0	10	f	\N	030b6275-2450-434f-adf4-829425b5ab7c
a6ebca85-3e5f-487e-86d9-55f54bed7818	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f7e6e35a-657f-49cd-adec-3848910187bd	0	20	t	66faaa6e-dffb-40eb-b8a6-c1adb41444b8	\N
d364ba15-0f84-4b4a-a413-7aca70e91d72	\N	idp-create-user-if-unique	81ce423f-6d27-457d-908e-6ad3e5d50ea2	66faaa6e-dffb-40eb-b8a6-c1adb41444b8	2	10	f	\N	af71a82a-3fc8-415d-803d-ed4e98ad31f1
605bc0f2-4746-4a7f-bded-fdfb066b0b11	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	66faaa6e-dffb-40eb-b8a6-c1adb41444b8	2	20	t	066175f1-1a0c-460e-9651-f04d22c7ca17	\N
0b6d7b82-373e-445b-b71f-2e3f9fbd8b5c	\N	idp-confirm-link	81ce423f-6d27-457d-908e-6ad3e5d50ea2	066175f1-1a0c-460e-9651-f04d22c7ca17	0	10	f	\N	\N
eeb2bacf-16a0-44b0-a315-b487089b26b5	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	066175f1-1a0c-460e-9651-f04d22c7ca17	0	20	t	464aab14-e1f1-429b-9256-cc74f86f7c91	\N
5b939125-69e9-4413-b9d6-211c77f0fa37	\N	idp-email-verification	81ce423f-6d27-457d-908e-6ad3e5d50ea2	464aab14-e1f1-429b-9256-cc74f86f7c91	2	10	f	\N	\N
1532c2d9-2df1-40b7-bffd-76278b587780	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	464aab14-e1f1-429b-9256-cc74f86f7c91	2	20	t	452a5737-241b-483c-8924-69c609b5041c	\N
ab00bda3-acea-46d5-8d76-33a6bcb6e4ca	\N	idp-username-password-form	81ce423f-6d27-457d-908e-6ad3e5d50ea2	452a5737-241b-483c-8924-69c609b5041c	0	10	f	\N	\N
580d7444-2202-47ef-8a13-499c12fec5c0	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	452a5737-241b-483c-8924-69c609b5041c	1	20	t	f63e30cc-02d5-4804-8880-051ba4c67869	\N
caa143aa-8c76-469f-95c2-9d1c82f8c477	\N	conditional-user-configured	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f63e30cc-02d5-4804-8880-051ba4c67869	0	10	f	\N	\N
2f6860e3-0e37-4283-8987-5f314db022d1	\N	auth-otp-form	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f63e30cc-02d5-4804-8880-051ba4c67869	0	20	f	\N	\N
da993fa2-e46f-4caf-a183-62f0ab143cff	\N	http-basic-authenticator	81ce423f-6d27-457d-908e-6ad3e5d50ea2	bedc913b-9f62-4afc-9e77-2b04447e5704	0	10	f	\N	\N
72c876f7-97a2-4bbf-b73b-62d6ff365adc	\N	docker-http-basic-authenticator	81ce423f-6d27-457d-908e-6ad3e5d50ea2	12fd4eaa-037f-4a96-946f-532fdbb6bea2	0	10	f	\N	\N
55bbd7eb-51bf-48c6-80e4-3e549247f848	\N	auth-cookie	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	e2872534-b129-484f-a0e5-a0896b5a6c4a	2	10	f	\N	\N
cf318178-3c55-4b21-8756-a619ebba5dbe	\N	auth-spnego	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	e2872534-b129-484f-a0e5-a0896b5a6c4a	3	20	f	\N	\N
8348fcfd-95d4-44f1-a53f-d6ba437eb526	\N	identity-provider-redirector	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	e2872534-b129-484f-a0e5-a0896b5a6c4a	2	25	f	\N	\N
a4c70031-678c-441f-9c7d-be329515c95f	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	e2872534-b129-484f-a0e5-a0896b5a6c4a	2	30	t	dd0c2c0c-72d4-4c46-bd1a-4fd421e64645	\N
b1fe8271-0d94-4204-be67-83e27469710a	\N	auth-username-password-form	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	dd0c2c0c-72d4-4c46-bd1a-4fd421e64645	0	10	f	\N	\N
ce5b76cf-7164-432b-a51b-bf6aaf7468f6	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	dd0c2c0c-72d4-4c46-bd1a-4fd421e64645	1	20	t	c8ff01f6-5e14-4912-a740-19d3f59d751b	\N
441eef7b-e5f0-490d-93b8-f93b94880067	\N	conditional-user-configured	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c8ff01f6-5e14-4912-a740-19d3f59d751b	0	10	f	\N	\N
48bad1c1-aac3-45f7-8cfb-ef977179bfb1	\N	auth-otp-form	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c8ff01f6-5e14-4912-a740-19d3f59d751b	0	20	f	\N	\N
b5927eac-6fc9-4e72-9505-e2417e3fea3a	\N	direct-grant-validate-username	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	ee706fa2-3180-4ead-a5c0-10ae1aaf9792	0	10	f	\N	\N
ecdb3080-899f-4635-92c2-feff76c3d5bb	\N	direct-grant-validate-password	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	ee706fa2-3180-4ead-a5c0-10ae1aaf9792	0	20	f	\N	\N
6f7f531c-f5fa-4462-82c6-ab69f21041bf	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	ee706fa2-3180-4ead-a5c0-10ae1aaf9792	1	30	t	0f700a9c-54ff-4c3d-a5ab-9132796d6bd2	\N
3edc5fc7-6a48-432d-a84b-c45b0818a89e	\N	conditional-user-configured	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0f700a9c-54ff-4c3d-a5ab-9132796d6bd2	0	10	f	\N	\N
471200e8-441c-404e-a763-d4dadf1e6b68	\N	direct-grant-validate-otp	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0f700a9c-54ff-4c3d-a5ab-9132796d6bd2	0	20	f	\N	\N
f0977a4e-8429-4f18-8ab6-49622073c425	\N	registration-page-form	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	520da3d3-98c7-4f1d-baf9-6270bc787c5c	0	10	t	67a70400-0703-43fd-9d7b-e63e3b7239ab	\N
dcbb15a3-8791-4a3a-bdfc-287b192f773d	\N	registration-user-creation	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	67a70400-0703-43fd-9d7b-e63e3b7239ab	0	20	f	\N	\N
d7c4df0f-6c03-4b86-ab8c-6103bc17ec04	\N	registration-password-action	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	67a70400-0703-43fd-9d7b-e63e3b7239ab	0	50	f	\N	\N
6832bb02-44b2-47c2-89dc-898893a80136	\N	registration-recaptcha-action	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	67a70400-0703-43fd-9d7b-e63e3b7239ab	3	60	f	\N	\N
36580f02-a491-4315-816e-2bf708633eb3	\N	reset-credentials-choose-user	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	68bbfdb1-6a70-45c9-b6d9-2ef62b6925fb	0	10	f	\N	\N
641d657e-7fe3-4115-8c43-5a8e87460647	\N	reset-credential-email	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	68bbfdb1-6a70-45c9-b6d9-2ef62b6925fb	0	20	f	\N	\N
babb76d4-541b-4571-816f-9f428e76747c	\N	reset-password	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	68bbfdb1-6a70-45c9-b6d9-2ef62b6925fb	0	30	f	\N	\N
6d958521-7afc-4331-b0f9-436667bf6a20	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	68bbfdb1-6a70-45c9-b6d9-2ef62b6925fb	1	40	t	9b6618b6-4cc2-49dd-beec-de2f2fa77348	\N
db441462-a800-4f3e-afe4-623427533093	\N	conditional-user-configured	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	9b6618b6-4cc2-49dd-beec-de2f2fa77348	0	10	f	\N	\N
ecc7fa94-d566-460b-b2dd-0aadb8ba774e	\N	reset-otp	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	9b6618b6-4cc2-49dd-beec-de2f2fa77348	0	20	f	\N	\N
f256e796-e135-4bce-be3b-6bbcb69ba24d	\N	client-secret	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c2d9f4b8-c337-477b-8cf0-94f6f73553d3	2	10	f	\N	\N
4ea250c3-7e01-4180-aa4e-5634adb381f8	\N	client-jwt	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c2d9f4b8-c337-477b-8cf0-94f6f73553d3	2	20	f	\N	\N
47516483-ef9c-4f01-ae9b-5376e58e4cdc	\N	client-secret-jwt	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c2d9f4b8-c337-477b-8cf0-94f6f73553d3	2	30	f	\N	\N
c6cc4ee5-a01f-49dd-b5cc-6f5b6e9633e2	\N	client-x509	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c2d9f4b8-c337-477b-8cf0-94f6f73553d3	2	40	f	\N	\N
e9c9dabc-8492-49d2-9d48-e6e4d5b73472	\N	idp-review-profile	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	d78bad88-2cc6-4f39-b811-b400c52a5df6	0	10	f	\N	312141de-4121-4cd7-adf7-808059ab8a8b
e21dd715-85a4-432a-b0be-c1434e0d5730	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	d78bad88-2cc6-4f39-b811-b400c52a5df6	0	20	t	b81401f1-8325-4c22-99eb-1c6ac6a2b837	\N
7aaeda98-5f36-4b44-9ca0-062391a9bf8f	\N	idp-create-user-if-unique	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	b81401f1-8325-4c22-99eb-1c6ac6a2b837	2	10	f	\N	991c5463-8225-4e6c-8076-53129272de45
578d02f6-870f-4e45-a227-e3d9c86af6e7	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	b81401f1-8325-4c22-99eb-1c6ac6a2b837	2	20	t	87bd4a3e-0ed7-434f-8ffa-0cb003ce91d3	\N
2493b643-1771-4c2a-a6e5-27d6d7cad5a1	\N	idp-confirm-link	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	87bd4a3e-0ed7-434f-8ffa-0cb003ce91d3	0	10	f	\N	\N
4ac4e151-0908-412f-a524-0492179feecd	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	87bd4a3e-0ed7-434f-8ffa-0cb003ce91d3	0	20	t	6fce2324-051e-4ccb-b6c4-b004bfaf771b	\N
2f459fa2-6ef7-4682-87df-af4ec463b03b	\N	idp-email-verification	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	6fce2324-051e-4ccb-b6c4-b004bfaf771b	2	10	f	\N	\N
2628bfd7-0409-432f-b4cd-bb2485bb2cff	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	6fce2324-051e-4ccb-b6c4-b004bfaf771b	2	20	t	0eea3528-10ac-4302-b157-ddf8020143d6	\N
8c8d221b-387c-491c-accb-8a31ad9a3feb	\N	idp-username-password-form	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0eea3528-10ac-4302-b157-ddf8020143d6	0	10	f	\N	\N
213fd197-4fc6-4e97-884d-93ca24e9f01f	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0eea3528-10ac-4302-b157-ddf8020143d6	1	20	t	773c567c-3da8-4123-a3d9-c442b942085f	\N
a585d01a-2166-4f93-b27d-3c50e62e3244	\N	conditional-user-configured	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	773c567c-3da8-4123-a3d9-c442b942085f	0	10	f	\N	\N
1d6acf70-7fb0-4c8e-b889-cb0add01ddba	\N	auth-otp-form	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	773c567c-3da8-4123-a3d9-c442b942085f	0	20	f	\N	\N
c983eee7-c920-4a24-9baf-0e437b60c5b6	\N	http-basic-authenticator	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	dc1ecdbe-85b4-4591-84b6-e27ef9ac51f3	0	10	f	\N	\N
27cd0786-057b-47dd-a372-0e7dd83ede63	\N	docker-http-basic-authenticator	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	6a3ca839-c6b5-4a60-a1f9-953eb98d3c46	0	10	f	\N	\N
\.


--
-- Data for Name: authentication_flow; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.authentication_flow (id, alias, description, realm_id, provider_id, top_level, built_in) FROM stdin;
4ba39979-6543-4b27-ad49-939717a02ada	browser	browser based authentication	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
6a6996ab-2c03-4458-8c8a-4561ada44254	forms	Username, password, otp and other auth forms.	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
20f51944-9d49-4a4c-b256-15cf1a09ad24	Browser - Conditional OTP	Flow to determine if the OTP is required for the authentication	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
695e6ecb-0fbc-4630-af27-b53520bcbbe5	direct grant	OpenID Connect Resource Owner Grant	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
c289a819-4f8f-42ea-8e6b-9def4cd6f647	Direct Grant - Conditional OTP	Flow to determine if the OTP is required for the authentication	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
cc8a7a03-4bbb-44d7-9b56-d6b4dc5c5903	registration	registration flow	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
ee6054a6-e7a0-4952-ac9e-a2cc85650558	registration form	registration form	81ce423f-6d27-457d-908e-6ad3e5d50ea2	form-flow	f	t
e051a36e-f974-4422-a565-3f8e63d5294f	reset credentials	Reset credentials for a user if they forgot their password or something	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
b0db9685-46fd-4406-93e8-f7ca45bf61f7	Reset - Conditional OTP	Flow to determine if the OTP should be reset or not. Set to REQUIRED to force.	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
c9968038-99ee-4c38-a81e-4d110f7f239b	clients	Base authentication for clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	client-flow	t	t
f7e6e35a-657f-49cd-adec-3848910187bd	first broker login	Actions taken after first broker login with identity provider account, which is not yet linked to any Keycloak account	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
66faaa6e-dffb-40eb-b8a6-c1adb41444b8	User creation or linking	Flow for the existing/non-existing user alternatives	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
066175f1-1a0c-460e-9651-f04d22c7ca17	Handle Existing Account	Handle what to do if there is existing account with same email/username like authenticated identity provider	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
464aab14-e1f1-429b-9256-cc74f86f7c91	Account verification options	Method with which to verity the existing account	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
452a5737-241b-483c-8924-69c609b5041c	Verify Existing Account by Re-authentication	Reauthentication of existing account	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
f63e30cc-02d5-4804-8880-051ba4c67869	First broker login - Conditional OTP	Flow to determine if the OTP is required for the authentication	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	f	t
bedc913b-9f62-4afc-9e77-2b04447e5704	saml ecp	SAML ECP Profile Authentication Flow	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
12fd4eaa-037f-4a96-946f-532fdbb6bea2	docker auth	Used by Docker clients to authenticate against the IDP	81ce423f-6d27-457d-908e-6ad3e5d50ea2	basic-flow	t	t
e2872534-b129-484f-a0e5-a0896b5a6c4a	browser	browser based authentication	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
dd0c2c0c-72d4-4c46-bd1a-4fd421e64645	forms	Username, password, otp and other auth forms.	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
c8ff01f6-5e14-4912-a740-19d3f59d751b	Browser - Conditional OTP	Flow to determine if the OTP is required for the authentication	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
ee706fa2-3180-4ead-a5c0-10ae1aaf9792	direct grant	OpenID Connect Resource Owner Grant	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
0f700a9c-54ff-4c3d-a5ab-9132796d6bd2	Direct Grant - Conditional OTP	Flow to determine if the OTP is required for the authentication	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
520da3d3-98c7-4f1d-baf9-6270bc787c5c	registration	registration flow	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
67a70400-0703-43fd-9d7b-e63e3b7239ab	registration form	registration form	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	form-flow	f	t
68bbfdb1-6a70-45c9-b6d9-2ef62b6925fb	reset credentials	Reset credentials for a user if they forgot their password or something	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
9b6618b6-4cc2-49dd-beec-de2f2fa77348	Reset - Conditional OTP	Flow to determine if the OTP should be reset or not. Set to REQUIRED to force.	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
c2d9f4b8-c337-477b-8cf0-94f6f73553d3	clients	Base authentication for clients	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	client-flow	t	t
d78bad88-2cc6-4f39-b811-b400c52a5df6	first broker login	Actions taken after first broker login with identity provider account, which is not yet linked to any Keycloak account	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
b81401f1-8325-4c22-99eb-1c6ac6a2b837	User creation or linking	Flow for the existing/non-existing user alternatives	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
87bd4a3e-0ed7-434f-8ffa-0cb003ce91d3	Handle Existing Account	Handle what to do if there is existing account with same email/username like authenticated identity provider	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
6fce2324-051e-4ccb-b6c4-b004bfaf771b	Account verification options	Method with which to verity the existing account	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
0eea3528-10ac-4302-b157-ddf8020143d6	Verify Existing Account by Re-authentication	Reauthentication of existing account	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
773c567c-3da8-4123-a3d9-c442b942085f	First broker login - Conditional OTP	Flow to determine if the OTP is required for the authentication	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	f	t
dc1ecdbe-85b4-4591-84b6-e27ef9ac51f3	saml ecp	SAML ECP Profile Authentication Flow	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
6a3ca839-c6b5-4a60-a1f9-953eb98d3c46	docker auth	Used by Docker clients to authenticate against the IDP	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	basic-flow	t	t
\.


--
-- Data for Name: authenticator_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.authenticator_config (id, alias, realm_id) FROM stdin;
030b6275-2450-434f-adf4-829425b5ab7c	review profile config	81ce423f-6d27-457d-908e-6ad3e5d50ea2
af71a82a-3fc8-415d-803d-ed4e98ad31f1	create unique user config	81ce423f-6d27-457d-908e-6ad3e5d50ea2
312141de-4121-4cd7-adf7-808059ab8a8b	review profile config	55599141-ecd7-4537-b4aa-4abaa9ee0ba2
991c5463-8225-4e6c-8076-53129272de45	create unique user config	55599141-ecd7-4537-b4aa-4abaa9ee0ba2
\.


--
-- Data for Name: authenticator_config_entry; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.authenticator_config_entry (authenticator_id, value, name) FROM stdin;
030b6275-2450-434f-adf4-829425b5ab7c	missing	update.profile.on.first.login
af71a82a-3fc8-415d-803d-ed4e98ad31f1	false	require.password.update.after.registration
312141de-4121-4cd7-adf7-808059ab8a8b	missing	update.profile.on.first.login
991c5463-8225-4e6c-8076-53129272de45	false	require.password.update.after.registration
\.


--
-- Data for Name: broker_link; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.broker_link (identity_provider, storage_provider_id, realm_id, broker_user_id, broker_username, token, user_id) FROM stdin;
\.


--
-- Data for Name: client; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client (id, enabled, full_scope_allowed, client_id, not_before, public_client, secret, base_url, bearer_only, management_url, surrogate_auth_required, realm_id, protocol, node_rereg_timeout, frontchannel_logout, consent_required, name, service_accounts_enabled, client_authenticator_type, root_url, description, registration_token, standard_flow_enabled, implicit_flow_enabled, direct_access_grants_enabled, always_display_in_console) FROM stdin;
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	f	master-realm	0	f	\N	\N	t	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	0	f	f	master Realm	f	client-secret	\N	\N	\N	t	f	f	f
289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	f	account	0	t	\N	/realms/master/account/	f	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	openid-connect	0	f	f	${client_account}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
f92a3457-b0d6-46eb-94c7-73e800c4bec0	t	f	account-console	0	t	\N	/realms/master/account/	f	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	openid-connect	0	f	f	${client_account-console}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	t	f	broker	0	f	\N	\N	t	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	openid-connect	0	f	f	${client_broker}	f	client-secret	\N	\N	\N	t	f	f	f
5ed82a86-ee2d-4a26-9cfe-96894d665876	t	f	security-admin-console	0	t	\N	/admin/master/console/	f	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	openid-connect	0	f	f	${client_security-admin-console}	f	client-secret	${authAdminUrl}	\N	\N	t	f	f	f
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	t	f	admin-cli	0	t	\N	\N	f	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	openid-connect	0	f	f	${client_admin-cli}	f	client-secret	\N	\N	\N	f	f	t	f
d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	f	projecthub-realm	0	f	\N	\N	t	\N	f	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	0	f	f	projecthub Realm	f	client-secret	\N	\N	\N	t	f	f	f
515acdae-2d03-413b-ab7c-8746fbe441d6	t	f	realm-management	0	f	\N	\N	t	\N	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	0	f	f	${client_realm-management}	f	client-secret	\N	\N	\N	t	f	f	f
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	f	account	0	t	\N	/realms/projecthub/account/	f	\N	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	0	f	f	${client_account}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	t	f	account-console	0	t	\N	/realms/projecthub/account/	f	\N	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	0	f	f	${client_account-console}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
55d16125-13f3-4107-8d49-88bd01aee599	t	f	broker	0	f	\N	\N	t	\N	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	0	f	f	${client_broker}	f	client-secret	\N	\N	\N	t	f	f	f
adfad328-7317-45a3-a350-ac722c036de9	t	f	security-admin-console	0	t	\N	/admin/projecthub/console/	f	\N	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	0	f	f	${client_security-admin-console}	f	client-secret	${authAdminUrl}	\N	\N	t	f	f	f
2464c80b-cfe8-4055-99bc-43db04058009	t	f	admin-cli	0	t	\N	\N	f	\N	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	0	f	f	${client_admin-cli}	f	client-secret	\N	\N	\N	f	f	t	f
0ddc2e3b-80ec-4439-a912-9bfbff102504	t	t	projecthub-backend	0	f	EVdh9rtOr5DT9CMHt146CVfOjHLD2RLl		f		f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	-1	t	f	projecthub-backend	t	client-secret			dce75e5f-4f27-483d-8f22-b2c4e723af9d	f	f	f	f
e29200a5-a570-4ff9-89aa-1383abbff2ca	t	t	projecthub-frontend	0	t	\N	http://localhost	f	http://localhost:8080	f	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	openid-connect	-1	t	f	projecthub-frontend	f	client-secret	http://localhost		\N	t	f	f	f
\.


--
-- Data for Name: client_attributes; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_attributes (client_id, name, value) FROM stdin;
289cc572-5dd8-4eef-ad7c-cdf72368d79f	post.logout.redirect.uris	+
f92a3457-b0d6-46eb-94c7-73e800c4bec0	post.logout.redirect.uris	+
f92a3457-b0d6-46eb-94c7-73e800c4bec0	pkce.code.challenge.method	S256
5ed82a86-ee2d-4a26-9cfe-96894d665876	post.logout.redirect.uris	+
5ed82a86-ee2d-4a26-9cfe-96894d665876	pkce.code.challenge.method	S256
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	post.logout.redirect.uris	+
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	post.logout.redirect.uris	+
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	pkce.code.challenge.method	S256
adfad328-7317-45a3-a350-ac722c036de9	post.logout.redirect.uris	+
adfad328-7317-45a3-a350-ac722c036de9	pkce.code.challenge.method	S256
0ddc2e3b-80ec-4439-a912-9bfbff102504	client.secret.creation.time	1772741535
0ddc2e3b-80ec-4439-a912-9bfbff102504	oauth2.device.authorization.grant.enabled	false
0ddc2e3b-80ec-4439-a912-9bfbff102504	oidc.ciba.grant.enabled	false
0ddc2e3b-80ec-4439-a912-9bfbff102504	backchannel.logout.session.required	true
0ddc2e3b-80ec-4439-a912-9bfbff102504	backchannel.logout.revoke.offline.tokens	false
e29200a5-a570-4ff9-89aa-1383abbff2ca	oauth2.device.authorization.grant.enabled	false
e29200a5-a570-4ff9-89aa-1383abbff2ca	oidc.ciba.grant.enabled	false
e29200a5-a570-4ff9-89aa-1383abbff2ca	backchannel.logout.session.required	true
e29200a5-a570-4ff9-89aa-1383abbff2ca	backchannel.logout.revoke.offline.tokens	false
e29200a5-a570-4ff9-89aa-1383abbff2ca	display.on.consent.screen	false
0ddc2e3b-80ec-4439-a912-9bfbff102504	jwt.credential.certificate	MIICszCCAZsCBgGcxDroQzANBgkqhkiG9w0BAQsFADAdMRswGQYDVQQDDBJwcm9qZWN0aHViLWJhY2tlbmQwHhcNMjYwMzA2MTczNzAwWhcNMzYwMzA2MTczODQwWjAdMRswGQYDVQQDDBJwcm9qZWN0aHViLWJhY2tlbmQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC16DrKUzkk1aJyFZdgMs5kdQavNv2P42nnZplA7dBQm5qtwlP/mrckz6u+yMyw4EBaAkJ5lgMwXMGsPwtpeNpsHaaJWAl9N6F8e4sOggcXmXDyUsdCvGtJcup7EWw7NcN8fkH1q0UMip4PeXs2VJU901l+bdLHnBtmFME9Nb1jQdUII9Y1yRvaO59DfA4psUR5t2yO/GrK+TecAHJaqN42Qz09ouJa0//leQixlIDKgdpPGCWB0JLckrMwbdswEJBMchIEDSznSAMurgwYBgm7wor03+6beayagxUxnRfZmNzVRyJpoxw0uX4l6CX+qX/F3n3A2Upzq1UiuNFAuIktAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAKZBREQ40AYW3qq9sQjY9D+nhMu5jvQ70rnwDSD8foinyW00uO1J7T8iPZc6OTCvda65sdWh3cu985UvBvEIMdHeG0VzpDUUvjqBJ9a5DVVXlo7TDos9uvay5EhqPWvDuomoMRlEvj4k4UVSTBQ+6v83vSYUhhojW7cg1NtwsZSl5uggj4svv5nhWFJ4/ELu6YASWiVzQcmns9uMlv2P5RtWMuYesoOhQjFUMoDmyjscyPm36iC9EAKCP5SYprnSdrRXttDbobYAOE4CbCE0PLHWfy/XA2oeuRP49WLLdk7n1GglNJpU9xpBGsdrPP29u5gCywothEA2XJmLpFF753s=
e29200a5-a570-4ff9-89aa-1383abbff2ca	post.logout.redirect.uris	http://localhost/##http://127.0.0.1:*##http://localhost:*##http://localhost:5173/*##http://localhost:5173##http://localhost
\.


--
-- Data for Name: client_auth_flow_bindings; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_auth_flow_bindings (client_id, flow_id, binding_name) FROM stdin;
\.


--
-- Data for Name: client_initial_access; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_initial_access (id, realm_id, "timestamp", expiration, count, remaining_count) FROM stdin;
\.


--
-- Data for Name: client_node_registrations; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_node_registrations (client_id, value, name) FROM stdin;
\.


--
-- Data for Name: client_scope; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_scope (id, name, realm_id, description, protocol) FROM stdin;
9faad29a-419b-447a-bf8c-5240cb84224f	offline_access	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect built-in scope: offline_access	openid-connect
f3940cf4-8856-40b2-82d8-a4c0c045fcb4	role_list	81ce423f-6d27-457d-908e-6ad3e5d50ea2	SAML role list	saml
0e0bce7c-3b57-4254-b6db-881c44445462	profile	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect built-in scope: profile	openid-connect
e9d50e83-c6ee-4b97-9271-b578286aa81e	email	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect built-in scope: email	openid-connect
fd0968cc-c08e-407d-ae7d-2df7a62f112c	address	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect built-in scope: address	openid-connect
6b8f416c-3650-4305-8283-7b4b3bd60aff	phone	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect built-in scope: phone	openid-connect
95723787-cf89-4a71-af07-3f6b17e1706e	roles	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect scope for add user roles to the access token	openid-connect
46990251-659e-4142-bcd8-3f6ea745bdfd	web-origins	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect scope for add allowed web origins to the access token	openid-connect
5b157794-4036-44f0-a2a1-1ba133ea87c8	microprofile-jwt	81ce423f-6d27-457d-908e-6ad3e5d50ea2	Microprofile - JWT built-in scope	openid-connect
d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	acr	81ce423f-6d27-457d-908e-6ad3e5d50ea2	OpenID Connect scope for add acr (authentication context class reference) to the token	openid-connect
8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	offline_access	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect built-in scope: offline_access	openid-connect
f6bbbe2e-7a55-417b-b1c8-c42d4a89b1a4	role_list	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	SAML role list	saml
c6204bb2-b524-49a1-a713-e2959bbbd316	profile	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect built-in scope: profile	openid-connect
6ab6c4e1-e734-4c50-8743-da14f08eaed3	email	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect built-in scope: email	openid-connect
670b1813-236c-4e62-a2e5-e1655e2e67b4	address	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect built-in scope: address	openid-connect
da7a43fb-2d6c-4426-9b53-25cf20fe71ea	phone	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect built-in scope: phone	openid-connect
1ff68379-2fde-42b8-ad84-64a8580f117b	roles	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect scope for add user roles to the access token	openid-connect
3df9962d-ee71-4b2a-ba69-e287eb719a3f	web-origins	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect scope for add allowed web origins to the access token	openid-connect
4e1dde19-0bf0-4875-8134-7766d61fc54b	microprofile-jwt	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	Microprofile - JWT built-in scope	openid-connect
bfc118e0-dd79-4559-bf33-a6363c98b72a	acr	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	OpenID Connect scope for add acr (authentication context class reference) to the token	openid-connect
\.


--
-- Data for Name: client_scope_attributes; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_scope_attributes (scope_id, value, name) FROM stdin;
9faad29a-419b-447a-bf8c-5240cb84224f	true	display.on.consent.screen
9faad29a-419b-447a-bf8c-5240cb84224f	${offlineAccessScopeConsentText}	consent.screen.text
f3940cf4-8856-40b2-82d8-a4c0c045fcb4	true	display.on.consent.screen
f3940cf4-8856-40b2-82d8-a4c0c045fcb4	${samlRoleListScopeConsentText}	consent.screen.text
0e0bce7c-3b57-4254-b6db-881c44445462	true	display.on.consent.screen
0e0bce7c-3b57-4254-b6db-881c44445462	${profileScopeConsentText}	consent.screen.text
0e0bce7c-3b57-4254-b6db-881c44445462	true	include.in.token.scope
e9d50e83-c6ee-4b97-9271-b578286aa81e	true	display.on.consent.screen
e9d50e83-c6ee-4b97-9271-b578286aa81e	${emailScopeConsentText}	consent.screen.text
e9d50e83-c6ee-4b97-9271-b578286aa81e	true	include.in.token.scope
fd0968cc-c08e-407d-ae7d-2df7a62f112c	true	display.on.consent.screen
fd0968cc-c08e-407d-ae7d-2df7a62f112c	${addressScopeConsentText}	consent.screen.text
fd0968cc-c08e-407d-ae7d-2df7a62f112c	true	include.in.token.scope
6b8f416c-3650-4305-8283-7b4b3bd60aff	true	display.on.consent.screen
6b8f416c-3650-4305-8283-7b4b3bd60aff	${phoneScopeConsentText}	consent.screen.text
6b8f416c-3650-4305-8283-7b4b3bd60aff	true	include.in.token.scope
95723787-cf89-4a71-af07-3f6b17e1706e	true	display.on.consent.screen
95723787-cf89-4a71-af07-3f6b17e1706e	${rolesScopeConsentText}	consent.screen.text
95723787-cf89-4a71-af07-3f6b17e1706e	false	include.in.token.scope
46990251-659e-4142-bcd8-3f6ea745bdfd	false	display.on.consent.screen
46990251-659e-4142-bcd8-3f6ea745bdfd		consent.screen.text
46990251-659e-4142-bcd8-3f6ea745bdfd	false	include.in.token.scope
5b157794-4036-44f0-a2a1-1ba133ea87c8	false	display.on.consent.screen
5b157794-4036-44f0-a2a1-1ba133ea87c8	true	include.in.token.scope
d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	false	display.on.consent.screen
d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	false	include.in.token.scope
8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	true	display.on.consent.screen
8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	${offlineAccessScopeConsentText}	consent.screen.text
f6bbbe2e-7a55-417b-b1c8-c42d4a89b1a4	true	display.on.consent.screen
f6bbbe2e-7a55-417b-b1c8-c42d4a89b1a4	${samlRoleListScopeConsentText}	consent.screen.text
c6204bb2-b524-49a1-a713-e2959bbbd316	true	display.on.consent.screen
c6204bb2-b524-49a1-a713-e2959bbbd316	${profileScopeConsentText}	consent.screen.text
c6204bb2-b524-49a1-a713-e2959bbbd316	true	include.in.token.scope
6ab6c4e1-e734-4c50-8743-da14f08eaed3	true	display.on.consent.screen
6ab6c4e1-e734-4c50-8743-da14f08eaed3	${emailScopeConsentText}	consent.screen.text
6ab6c4e1-e734-4c50-8743-da14f08eaed3	true	include.in.token.scope
670b1813-236c-4e62-a2e5-e1655e2e67b4	true	display.on.consent.screen
670b1813-236c-4e62-a2e5-e1655e2e67b4	${addressScopeConsentText}	consent.screen.text
670b1813-236c-4e62-a2e5-e1655e2e67b4	true	include.in.token.scope
da7a43fb-2d6c-4426-9b53-25cf20fe71ea	true	display.on.consent.screen
da7a43fb-2d6c-4426-9b53-25cf20fe71ea	${phoneScopeConsentText}	consent.screen.text
da7a43fb-2d6c-4426-9b53-25cf20fe71ea	true	include.in.token.scope
1ff68379-2fde-42b8-ad84-64a8580f117b	true	display.on.consent.screen
1ff68379-2fde-42b8-ad84-64a8580f117b	${rolesScopeConsentText}	consent.screen.text
1ff68379-2fde-42b8-ad84-64a8580f117b	false	include.in.token.scope
3df9962d-ee71-4b2a-ba69-e287eb719a3f	false	display.on.consent.screen
3df9962d-ee71-4b2a-ba69-e287eb719a3f		consent.screen.text
3df9962d-ee71-4b2a-ba69-e287eb719a3f	false	include.in.token.scope
4e1dde19-0bf0-4875-8134-7766d61fc54b	false	display.on.consent.screen
4e1dde19-0bf0-4875-8134-7766d61fc54b	true	include.in.token.scope
bfc118e0-dd79-4559-bf33-a6363c98b72a	false	display.on.consent.screen
bfc118e0-dd79-4559-bf33-a6363c98b72a	false	include.in.token.scope
\.


--
-- Data for Name: client_scope_client; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_scope_client (client_id, scope_id, default_scope) FROM stdin;
289cc572-5dd8-4eef-ad7c-cdf72368d79f	46990251-659e-4142-bcd8-3f6ea745bdfd	t
289cc572-5dd8-4eef-ad7c-cdf72368d79f	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
289cc572-5dd8-4eef-ad7c-cdf72368d79f	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
289cc572-5dd8-4eef-ad7c-cdf72368d79f	0e0bce7c-3b57-4254-b6db-881c44445462	t
289cc572-5dd8-4eef-ad7c-cdf72368d79f	95723787-cf89-4a71-af07-3f6b17e1706e	t
289cc572-5dd8-4eef-ad7c-cdf72368d79f	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
289cc572-5dd8-4eef-ad7c-cdf72368d79f	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
289cc572-5dd8-4eef-ad7c-cdf72368d79f	9faad29a-419b-447a-bf8c-5240cb84224f	f
289cc572-5dd8-4eef-ad7c-cdf72368d79f	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
f92a3457-b0d6-46eb-94c7-73e800c4bec0	46990251-659e-4142-bcd8-3f6ea745bdfd	t
f92a3457-b0d6-46eb-94c7-73e800c4bec0	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
f92a3457-b0d6-46eb-94c7-73e800c4bec0	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
f92a3457-b0d6-46eb-94c7-73e800c4bec0	0e0bce7c-3b57-4254-b6db-881c44445462	t
f92a3457-b0d6-46eb-94c7-73e800c4bec0	95723787-cf89-4a71-af07-3f6b17e1706e	t
f92a3457-b0d6-46eb-94c7-73e800c4bec0	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
f92a3457-b0d6-46eb-94c7-73e800c4bec0	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
f92a3457-b0d6-46eb-94c7-73e800c4bec0	9faad29a-419b-447a-bf8c-5240cb84224f	f
f92a3457-b0d6-46eb-94c7-73e800c4bec0	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	46990251-659e-4142-bcd8-3f6ea745bdfd	t
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	0e0bce7c-3b57-4254-b6db-881c44445462	t
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	95723787-cf89-4a71-af07-3f6b17e1706e	t
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	9faad29a-419b-447a-bf8c-5240cb84224f	f
a990983f-fa70-4ed4-9ecf-a30b2c5ef987	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	46990251-659e-4142-bcd8-3f6ea745bdfd	t
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	0e0bce7c-3b57-4254-b6db-881c44445462	t
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	95723787-cf89-4a71-af07-3f6b17e1706e	t
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	9faad29a-419b-447a-bf8c-5240cb84224f	f
de6bc198-3c35-4bb5-860c-ea6cfa8037e4	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	46990251-659e-4142-bcd8-3f6ea745bdfd	t
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	0e0bce7c-3b57-4254-b6db-881c44445462	t
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	95723787-cf89-4a71-af07-3f6b17e1706e	t
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	9faad29a-419b-447a-bf8c-5240cb84224f	f
7dfa79e6-c891-4fc2-9df7-77932d7b98e1	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
5ed82a86-ee2d-4a26-9cfe-96894d665876	46990251-659e-4142-bcd8-3f6ea745bdfd	t
5ed82a86-ee2d-4a26-9cfe-96894d665876	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
5ed82a86-ee2d-4a26-9cfe-96894d665876	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
5ed82a86-ee2d-4a26-9cfe-96894d665876	0e0bce7c-3b57-4254-b6db-881c44445462	t
5ed82a86-ee2d-4a26-9cfe-96894d665876	95723787-cf89-4a71-af07-3f6b17e1706e	t
5ed82a86-ee2d-4a26-9cfe-96894d665876	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
5ed82a86-ee2d-4a26-9cfe-96894d665876	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
5ed82a86-ee2d-4a26-9cfe-96894d665876	9faad29a-419b-447a-bf8c-5240cb84224f	f
5ed82a86-ee2d-4a26-9cfe-96894d665876	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	c6204bb2-b524-49a1-a713-e2959bbbd316	t
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	1ff68379-2fde-42b8-ad84-64a8580f117b	t
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	c6204bb2-b524-49a1-a713-e2959bbbd316	t
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	1ff68379-2fde-42b8-ad84-64a8580f117b	t
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
2464c80b-cfe8-4055-99bc-43db04058009	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
2464c80b-cfe8-4055-99bc-43db04058009	c6204bb2-b524-49a1-a713-e2959bbbd316	t
2464c80b-cfe8-4055-99bc-43db04058009	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
2464c80b-cfe8-4055-99bc-43db04058009	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
2464c80b-cfe8-4055-99bc-43db04058009	1ff68379-2fde-42b8-ad84-64a8580f117b	t
2464c80b-cfe8-4055-99bc-43db04058009	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
2464c80b-cfe8-4055-99bc-43db04058009	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
2464c80b-cfe8-4055-99bc-43db04058009	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
2464c80b-cfe8-4055-99bc-43db04058009	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
55d16125-13f3-4107-8d49-88bd01aee599	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
55d16125-13f3-4107-8d49-88bd01aee599	c6204bb2-b524-49a1-a713-e2959bbbd316	t
55d16125-13f3-4107-8d49-88bd01aee599	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
55d16125-13f3-4107-8d49-88bd01aee599	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
55d16125-13f3-4107-8d49-88bd01aee599	1ff68379-2fde-42b8-ad84-64a8580f117b	t
55d16125-13f3-4107-8d49-88bd01aee599	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
55d16125-13f3-4107-8d49-88bd01aee599	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
55d16125-13f3-4107-8d49-88bd01aee599	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
55d16125-13f3-4107-8d49-88bd01aee599	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
515acdae-2d03-413b-ab7c-8746fbe441d6	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
515acdae-2d03-413b-ab7c-8746fbe441d6	c6204bb2-b524-49a1-a713-e2959bbbd316	t
515acdae-2d03-413b-ab7c-8746fbe441d6	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
515acdae-2d03-413b-ab7c-8746fbe441d6	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
515acdae-2d03-413b-ab7c-8746fbe441d6	1ff68379-2fde-42b8-ad84-64a8580f117b	t
515acdae-2d03-413b-ab7c-8746fbe441d6	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
515acdae-2d03-413b-ab7c-8746fbe441d6	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
515acdae-2d03-413b-ab7c-8746fbe441d6	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
515acdae-2d03-413b-ab7c-8746fbe441d6	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
adfad328-7317-45a3-a350-ac722c036de9	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
adfad328-7317-45a3-a350-ac722c036de9	c6204bb2-b524-49a1-a713-e2959bbbd316	t
adfad328-7317-45a3-a350-ac722c036de9	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
adfad328-7317-45a3-a350-ac722c036de9	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
adfad328-7317-45a3-a350-ac722c036de9	1ff68379-2fde-42b8-ad84-64a8580f117b	t
adfad328-7317-45a3-a350-ac722c036de9	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
adfad328-7317-45a3-a350-ac722c036de9	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
adfad328-7317-45a3-a350-ac722c036de9	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
adfad328-7317-45a3-a350-ac722c036de9	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
0ddc2e3b-80ec-4439-a912-9bfbff102504	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
0ddc2e3b-80ec-4439-a912-9bfbff102504	c6204bb2-b524-49a1-a713-e2959bbbd316	t
0ddc2e3b-80ec-4439-a912-9bfbff102504	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
0ddc2e3b-80ec-4439-a912-9bfbff102504	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
0ddc2e3b-80ec-4439-a912-9bfbff102504	1ff68379-2fde-42b8-ad84-64a8580f117b	t
0ddc2e3b-80ec-4439-a912-9bfbff102504	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
0ddc2e3b-80ec-4439-a912-9bfbff102504	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
0ddc2e3b-80ec-4439-a912-9bfbff102504	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
0ddc2e3b-80ec-4439-a912-9bfbff102504	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
e29200a5-a570-4ff9-89aa-1383abbff2ca	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
e29200a5-a570-4ff9-89aa-1383abbff2ca	c6204bb2-b524-49a1-a713-e2959bbbd316	t
e29200a5-a570-4ff9-89aa-1383abbff2ca	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
e29200a5-a570-4ff9-89aa-1383abbff2ca	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
e29200a5-a570-4ff9-89aa-1383abbff2ca	1ff68379-2fde-42b8-ad84-64a8580f117b	t
e29200a5-a570-4ff9-89aa-1383abbff2ca	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
e29200a5-a570-4ff9-89aa-1383abbff2ca	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
e29200a5-a570-4ff9-89aa-1383abbff2ca	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
e29200a5-a570-4ff9-89aa-1383abbff2ca	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
\.


--
-- Data for Name: client_scope_role_mapping; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_scope_role_mapping (scope_id, role_id) FROM stdin;
9faad29a-419b-447a-bf8c-5240cb84224f	f6839928-9f95-4356-914c-16d7fc3c0dc9
8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	a7377c7e-a2d6-4cc2-844b-ddbb4e1904cb
\.


--
-- Data for Name: client_session; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_session (id, client_id, redirect_uri, state, "timestamp", session_id, auth_method, realm_id, auth_user_id, current_action) FROM stdin;
\.


--
-- Data for Name: client_session_auth_status; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_session_auth_status (authenticator, status, client_session) FROM stdin;
\.


--
-- Data for Name: client_session_note; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_session_note (name, value, client_session) FROM stdin;
\.


--
-- Data for Name: client_session_prot_mapper; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_session_prot_mapper (protocol_mapper_id, client_session) FROM stdin;
\.


--
-- Data for Name: client_session_role; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_session_role (role_id, client_session) FROM stdin;
\.


--
-- Data for Name: client_user_session_note; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.client_user_session_note (name, value, client_session) FROM stdin;
\.


--
-- Data for Name: component; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.component (id, name, parent_id, provider_id, provider_type, realm_id, sub_type) FROM stdin;
c80f19f3-67ba-4b27-9dfb-497cce16176a	Trusted Hosts	81ce423f-6d27-457d-908e-6ad3e5d50ea2	trusted-hosts	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	anonymous
089e7870-931c-416f-8e6c-bedd2d08211c	Consent Required	81ce423f-6d27-457d-908e-6ad3e5d50ea2	consent-required	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	anonymous
63045ec1-ab3e-442b-a496-2cb4a240f227	Full Scope Disabled	81ce423f-6d27-457d-908e-6ad3e5d50ea2	scope	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	anonymous
4f8cb2db-55dd-4214-8e0e-2f1e1161472c	Max Clients Limit	81ce423f-6d27-457d-908e-6ad3e5d50ea2	max-clients	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	anonymous
0e331997-f5b5-4006-97b5-f53b8e91f29f	Allowed Protocol Mapper Types	81ce423f-6d27-457d-908e-6ad3e5d50ea2	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	anonymous
8932b2d8-0ad1-4824-ab73-817c48c96612	Allowed Client Scopes	81ce423f-6d27-457d-908e-6ad3e5d50ea2	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	anonymous
6654abef-13e7-4708-aef7-06a85f420195	Allowed Protocol Mapper Types	81ce423f-6d27-457d-908e-6ad3e5d50ea2	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	authenticated
88093dbd-0a48-4ac8-8160-422208b94bad	Allowed Client Scopes	81ce423f-6d27-457d-908e-6ad3e5d50ea2	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	authenticated
91495b45-4448-45e4-9c1a-868676704760	rsa-generated	81ce423f-6d27-457d-908e-6ad3e5d50ea2	rsa-generated	org.keycloak.keys.KeyProvider	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N
218d13a2-b45b-4201-8f2a-1546d2755abe	rsa-enc-generated	81ce423f-6d27-457d-908e-6ad3e5d50ea2	rsa-enc-generated	org.keycloak.keys.KeyProvider	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N
2a0a8de6-b071-4fbc-a441-208f8b1e8ff6	hmac-generated	81ce423f-6d27-457d-908e-6ad3e5d50ea2	hmac-generated	org.keycloak.keys.KeyProvider	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N
35bc6d9f-7a74-473c-a937-336945803cb6	aes-generated	81ce423f-6d27-457d-908e-6ad3e5d50ea2	aes-generated	org.keycloak.keys.KeyProvider	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N
47956fdb-0f90-4ce8-9d47-c81a91c325b4	rsa-generated	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	rsa-generated	org.keycloak.keys.KeyProvider	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N
1b6c8dbc-59f0-4355-89f6-2c76626b42f8	rsa-enc-generated	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	rsa-enc-generated	org.keycloak.keys.KeyProvider	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N
dce61b1b-24d8-4516-9fc1-c732b0e006dd	hmac-generated	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	hmac-generated	org.keycloak.keys.KeyProvider	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N
44265dfc-7964-471e-9c62-b1d2c6e9eb53	aes-generated	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	aes-generated	org.keycloak.keys.KeyProvider	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N
53c3e198-18ce-4a1f-8140-c2c10d3bac0c	Trusted Hosts	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	trusted-hosts	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anonymous
c283617c-b9df-4dc9-9edf-3ccfddc5dd60	Consent Required	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	consent-required	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anonymous
df33f472-b76c-4a8e-b642-93806eb1e94a	Full Scope Disabled	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	scope	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anonymous
7d06da8a-363a-4662-bd5f-b8a849ebe80e	Max Clients Limit	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	max-clients	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anonymous
e3901623-69d2-41bd-9749-ce4d9227bfbc	Allowed Protocol Mapper Types	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anonymous
6b859079-577e-4af3-b6d2-dfe03b181457	Allowed Client Scopes	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anonymous
0e575732-2028-437c-999a-edb7835804a8	Allowed Protocol Mapper Types	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	authenticated
e503d53c-fbb7-43ec-8224-fcb87eb178f7	Allowed Client Scopes	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	authenticated
\.


--
-- Data for Name: component_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.component_config (id, component_id, name, value) FROM stdin;
d05e20d9-2bb5-45e0-9f0e-6ea1dc9d133f	c80f19f3-67ba-4b27-9dfb-497cce16176a	client-uris-must-match	true
f5b852cf-31f8-4785-abad-72c9822c2f6b	c80f19f3-67ba-4b27-9dfb-497cce16176a	host-sending-registration-request-must-match	true
f24c3ad8-c163-423f-8e36-e4998277c3a0	4f8cb2db-55dd-4214-8e0e-2f1e1161472c	max-clients	200
c5a2592f-13d2-4ce7-92cf-e4c2de97facb	8932b2d8-0ad1-4824-ab73-817c48c96612	allow-default-scopes	true
5ece24a0-9412-4a46-bb68-c1294f359831	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	saml-user-attribute-mapper
1d17eb15-6716-4038-85b8-c80bcd1b2b6f	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	saml-role-list-mapper
4d203fcc-2064-4cf8-9cda-1a6f45a9564c	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
e3e34974-6d16-4211-9388-9b9e80e65022	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	oidc-full-name-mapper
732d81ae-df34-4679-b5fa-ae76e0c52c76	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
5adcf583-846a-438b-94d0-5f615a754dc3	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	saml-user-property-mapper
38977158-0977-4a85-8549-613f60bb5ed7	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
b37f7d23-e3f8-42f5-bbd3-e41139691454	6654abef-13e7-4708-aef7-06a85f420195	allowed-protocol-mapper-types	oidc-address-mapper
ef9b16c4-a547-4333-abcb-fe95890bc7aa	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	oidc-address-mapper
397bc3c5-6dd8-4e47-9608-8e88f78250f8	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
6a5f5d90-25cc-4803-bb12-eb16a85d2956	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	saml-user-property-mapper
98a33fdb-6329-4554-b08d-823ffcd49966	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
5725027b-b983-49c6-8601-d44dc1db3944	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
08a2ddfd-661a-4067-894e-9abf64df0f27	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	oidc-full-name-mapper
04a0748b-e046-41c7-86ac-f70d80308ff9	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	saml-user-attribute-mapper
8882b29c-01a4-4a64-9f38-7c5d4fc8f68d	0e331997-f5b5-4006-97b5-f53b8e91f29f	allowed-protocol-mapper-types	saml-role-list-mapper
5cd24dfd-6165-457f-a6f9-94b096e8c8e0	88093dbd-0a48-4ac8-8160-422208b94bad	allow-default-scopes	true
1149bb35-b078-4eb0-9060-3901bd9f7228	91495b45-4448-45e4-9c1a-868676704760	privateKey	MIIEogIBAAKCAQEA17WvcwmGLViG/It3NoAXLDrXdl+7iKXFEFXmFjco4RnHOCCVkSXvMcQzTbg3k8db+8GlY4iH/oIa0FXNFyG0wHJ/rdG4pm75map2ftRTyR4lMjHukWGnli+xbZuUfgQBPdiWTvOztl0EZeyJAyEu/tBIkkrKkUP63vFV5JKjoM7/VpGkSVcxZgIXCWIwH6YZ0DcknOWNG6gArHxIxRasG7bgm8nL7R814f0x7PRJyxpDJJ3mgREc/PTlYDbpb0RsucnwSmk3MbkiaQKbyh+xkEUPTsYSyWyF2NL6Joz2xArQqwOwJBrIT8yEETppSSQgBgTr7EvrAvO5fNncBcuqowIDAQABAoIBAB7yJ7t/MEqtGqB8eZvOAIUN4/9NeJ//+CeBy0KAo1K32gbJVeu+33PqS9nohcCjpySVAV8oJSp0C9i7lnKtGTtKsdqD7dOitBhBhkJnv6Vot7ldxHYC5oH7UZ8B5Om3NV5kBhxJhgyxh4H/zyAt0Iop419pb2orsH/va30hNGxLQn9DcJuvuFZqkTwqIK7AGlXrDfaNWkcuQqjv0mz4APCJqTgUkCHhBsP6C7XblaLZiKy+XRbizIdC4wFzRXwZEsMrHcxFWGJHZv3ak9WUwt8TLQeM2kAht92y9wOKYLuPS16ffUZbJO5AwqRYYryDAkWOon2XXb8gcm+JvxsVVjECgYEA9zfey1imzouhRGnYrD7q6gRrsZ5zgRofWKwXcwxpNGPKrZ668PZ0L6/RIL0GH5Y5nAjFKkF4NUaqCQD+dqiheIcnXKyioAu3csRWwpVknGUYyAt56bFU5yhPn8sqiV5iASn3yCFdxZRAikHQFRh/1DkvVJYH49vxoo/qF+HhXXcCgYEA319JJp5zZOsuPf3Rl60VxdK6MJFVU2JJ0Vsa9GnQGr8YNObKj6NfXdf4V4wy5xq04ff8aK2aOmAajPcXlerjreNLlVI2pOG5VVH2riBm/VI3jEtAWVDWN7pmzGAHpBK4r8IZQDwD4MSmQQJb0GF/BsnQhoD2qczujTSYrDYXdzUCgYBFoYPsLHUXOfbbSSDRKwuJjGM07RdFZrErjZUxP26mZfEhQ9MNqa0B/Xheyz7dSLfDPikihLwx7UxZKuGBVG/efdrVXH6Vq5cpCSoStndXIZaASdM1wk/Sp+T9cgDyHhZmk4aJ5PP/gYlIJ89PEc53XP/6yCNCx6Fgkz5xKZsLcwKBgGfTJG886yoXXpEV71vu6dXfkweMJfryDpmvHSJKJJ6qABhmxfRp3aQDBL28vtRIx5bY64vEVZGYpf6rw1y9p0JmCfXIFvogqUKNLHnXOce5dXRSbgCV4Fxa2flZEXQj95BKSe5fdvX8scI51G9RQffnynMacoyOYrtjnSs+oT2ZAoGAWoQ7dppRjmc83QcHkzFKAiIsmV2sn7RiN5+n53ZnVO8IWfPo3pUbPYk2hfNlZnIR46lxHQWJvBC7Y+Fpo2u/YLsk63ENqVFjOUSAnqluz8d8TgCw/G7mXknRMdJWRCcnD6S9OABphOuSmOW5k5MnenFsdc2GZQ+JieifcVohUp8=
915f4268-8371-4274-8779-dfd8e11bc624	91495b45-4448-45e4-9c1a-868676704760	certificate	MIICmzCCAYMCBgGcv5pxbjANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjYwMzA1MjAwMzE1WhcNMzYwMzA1MjAwNDU1WjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDXta9zCYYtWIb8i3c2gBcsOtd2X7uIpcUQVeYWNyjhGcc4IJWRJe8xxDNNuDeTx1v7waVjiIf+ghrQVc0XIbTAcn+t0bimbvmZqnZ+1FPJHiUyMe6RYaeWL7Ftm5R+BAE92JZO87O2XQRl7IkDIS7+0EiSSsqRQ/re8VXkkqOgzv9WkaRJVzFmAhcJYjAfphnQNySc5Y0bqACsfEjFFqwbtuCbycvtHzXh/THs9EnLGkMkneaBERz89OVgNulvRGy5yfBKaTcxuSJpApvKH7GQRQ9OxhLJbIXY0vomjPbECtCrA7AkGshPzIQROmlJJCAGBOvsS+sC87l82dwFy6qjAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAAZGOXa88WZOEgedj/jPdxQK+ZIKqkEg1Lf/WUd4JRqfZzplc8ydzM3VzuR0LOreMarWe/I2iCO/syw3+x2olov84UjdRVc2sBbRnyW7f1ypkgfS1zM4v6x31xatRLpzfKhome4NcAXBzMY3T/fzPtnpSuXmlvWUZMnIdXkt/XWa5zM7Z1S+xctRE9NKMqj19P+y8u2s6Pg0YYgwYoLIyAqOyz1Eehx7QIj0vE0W76JXcT4sTxaLJBz0blCcyaMkbXiZRRBwsPFB7nZ2mXhDN4MNM6Au6j5jQhcpKaTNUCVrBw6TzsahvIU/bv1kUIB+isSimONeSnasQLoPRSR5jys=
c20fbb3d-038b-4ed3-a1bb-e2bb177046f9	91495b45-4448-45e4-9c1a-868676704760	keyUse	SIG
05077f33-75de-4060-bc4b-3440b4b11f7e	91495b45-4448-45e4-9c1a-868676704760	priority	100
92842500-b343-49b7-9589-bb7d826e8d87	218d13a2-b45b-4201-8f2a-1546d2755abe	certificate	MIICmzCCAYMCBgGcv5pyXDANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjYwMzA1MjAwMzE2WhcNMzYwMzA1MjAwNDU2WjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCnezWNZUHZpupTqo9fHyRzGCZ527Nb/cPPGrhTVjGuBjQXZDIaYUxJBpdg0mYigCxGGtRa1MFYoeOaIcvQdM3i1cVxh1sQjkF0ieULBegijj4bSXrL59l9lGYHnhGIz3YDC3SanNYDe4Kwl908i0N+rm+GY4+8mquuhMmQOyu87B+RzAsB+waCXlBKG1YCUMzE0ftOnXtjr7aud16g0Kuqk87cyBSR4dz78gT8moEngGVPdgqCB15ZuKoy8ZlkNzNBdb6ewHqOCKidKjikV23SzL3VNqoYk3SAJPOLVWhi13Dj/NqCTHV5+Oe+YW0skUNMwZlkG/lXH9sXtKBku1upAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAFd7s7pfT5l5zMcKxRM9ft4wgEm//+FFDJGxftpEb08slnG1QSeD6HfbadHBDQTu6aVAa/vFT6+GKf3jP/ZmMEwMY0F+5Dxh5oUOx+9qJhJbRg5tHGwHmOfB5NCgQ8v5jb0oyVkgGqreHGOS002d5YhkT1ER+CDmFIfpiPU+n0uoTZ05rZ98LpR6jseU2jUxg4BfBtYtd96PBXFpO64RY+P5xcrJyMbrzLzhuuJm/3ICTQF2wzhrVpzGx2Duii703mYud+uVNbDdxDtN9cTsznLhr9GiCKLSiG/hz8eyoC3eucYPFo6CeB/KJ6dVNRjPasBGZUKmfiW/x5XLcHONclY=
8f87704b-55e4-4ab9-9e27-1cfb80d5d68c	218d13a2-b45b-4201-8f2a-1546d2755abe	keyUse	ENC
0aa29507-9aa7-4d5a-bc00-c26fb42b7e23	218d13a2-b45b-4201-8f2a-1546d2755abe	algorithm	RSA-OAEP
74bb49a6-3eba-422d-b311-29f7261eccc3	218d13a2-b45b-4201-8f2a-1546d2755abe	priority	100
010b1aeb-4788-48e9-924f-edf8e4b26d74	218d13a2-b45b-4201-8f2a-1546d2755abe	privateKey	MIIEogIBAAKCAQEAp3s1jWVB2abqU6qPXx8kcxgmeduzW/3Dzxq4U1YxrgY0F2QyGmFMSQaXYNJmIoAsRhrUWtTBWKHjmiHL0HTN4tXFcYdbEI5BdInlCwXoIo4+G0l6y+fZfZRmB54RiM92Awt0mpzWA3uCsJfdPItDfq5vhmOPvJqrroTJkDsrvOwfkcwLAfsGgl5QShtWAlDMxNH7Tp17Y6+2rndeoNCrqpPO3MgUkeHc+/IE/JqBJ4BlT3YKggdeWbiqMvGZZDczQXW+nsB6jgionSo4pFdt0sy91TaqGJN0gCTzi1VoYtdw4/zagkx1efjnvmFtLJFDTMGZZBv5Vx/bF7SgZLtbqQIDAQABAoIBADiW6QFdtWJVg9fBSbBaVXaOMnH6SiBLHl5cKOv/s8mZTwCYWlWPirciAwQ0E06VAGCvsBEA0lOgX8c0pClLTkXW9V/m3F47suIttbaDyGvkpBeUPGmpbVOBUPhB8KrJbpaYyE11sNp8YSxKI/bRF302c3h1K5wOpvPQ6kpRs/WhRrh+Qe3UrlqOViNXWSn6NastmRvkCGpeqkgxjYig/HlThPMHy40v7iwzlnLr3w3eNa3Xc5v2xNrU5xytW0KTpdadHdTVC/0fvphS55k1xDRf53rI0Sd5mEV+AVm+4kYxMkiBvYCf/+Go9AXh9wCf8K7gFZo5PkkF+WdOpzbrWgECgYEA3wtOoKgjYmgxHmSIHeuLm8n5APErYnXgdKO7+zVJh8NMx5NboYpc7zfgKI5dN4eMkhu5tWoCtWl6YfbkPexGq+X5FydsNBlXs281vosQGSjTR1TI8xI6jCgq4qor4jqYkBjX6QnzluV3S7SpwA5mlsfVF6p95VcW+4gOZ4d5tasCgYEAwDo5aRnzbkjT2IlNtdqdnJIdvNhMrvV/HJk1N9WIj59S4vTt8gwCw0RrWz7cJ6maQguhT1H6qXmQYwmA31qKsoWgTVzYVciIUEboo8Mc0TedZS0A0FzKHOLRSw5K3WemjIT+Zlgw6OtXL3kvktJu6cIj8kDYPuMhQuwKrbObt/sCgYBucCjUf6xVk4WOqPSE7BZKYy05/DAhJoCnAFOZxP7NjDQ+NYaPa/UsNZx2OFeLoUBHMBc57m286adBToAg8RblEo/NmSWIfmvgWtZfrHeiHYbPsPl28bWvpEvnw57K+3yDDOoLZ3QHaUMyZxgOEpNVYUjv2OlRX1fv36RSOtBW1QKBgBjy9aSYg6natfQyze0+dJpvtIBgKoPCxT62+9tFUbYiXaWrWH7D5E/nv29WV0imkKjlzYf4AeqhJoZUI2/Z1oqZIVcpJ8Lqhha1PViT6FeXOkx5bNOeV3UsUzHEpx7ZZxpx4Hr0E1UHxocY2X3a5h5c3kGA/RAcdqKy9CfbWeilAoGAEIy2kpbYO33+R/qN1lC4CLopZRAYNAQWMQ5vEyJkci1jwDBez1COCys3yORlXp4jA8PjS8Cpkm2/T+ucp/gh/oXf2rQQfniW8+7mxI/9B4GgWKVjYZofymEXvW67GQkv5/NwFUJ0ol90Y0v1Ubq0m2h1FQSc/6kVuNXl+1ltzes=
825e2136-9a90-4351-9279-4ae42cb0b5ef	2a0a8de6-b071-4fbc-a441-208f8b1e8ff6	priority	100
601e3a82-f8d0-44d2-883a-812b1d58f440	2a0a8de6-b071-4fbc-a441-208f8b1e8ff6	secret	tZpKa4AR0F4IT3JaL56_ywsVZUPPnV-HIEeocHFiRHkvhjzZfbTd3bGzZ6w6VUx8HFIW_T_AJcf4ivTkrwI11A
8386b910-6679-4035-b385-8d826ca02b39	2a0a8de6-b071-4fbc-a441-208f8b1e8ff6	algorithm	HS256
2fbce5dd-f487-472e-b5b4-a6098b3bdd1e	2a0a8de6-b071-4fbc-a441-208f8b1e8ff6	kid	3b8decdd-cfce-4a9f-b62a-3594340c80e8
020fc84e-02bb-49e8-9971-df3e2b06eb42	35bc6d9f-7a74-473c-a937-336945803cb6	kid	7b9fa271-235b-4fd9-a6f3-c0838fdc4613
2de2f06d-1bc1-4604-a9a8-fd5a5f973943	35bc6d9f-7a74-473c-a937-336945803cb6	priority	100
3d30e910-7a5f-4272-a7c4-28cc5944038e	35bc6d9f-7a74-473c-a937-336945803cb6	secret	AsT_evfoDcDJDGT6z4jCQg
451e100b-6e6d-49c4-95c3-be337b5c9f05	dce61b1b-24d8-4516-9fc1-c732b0e006dd	kid	3b91842e-8866-498b-a839-0de4ded863a9
9d0d4857-773d-4d12-bffa-e5e16f2134c1	dce61b1b-24d8-4516-9fc1-c732b0e006dd	algorithm	HS256
12f11959-1482-47da-87a2-ea3e2ef2015d	dce61b1b-24d8-4516-9fc1-c732b0e006dd	secret	EuyOcr6IhHl618R8ObWFWFIb1UZN5Uqfmx-VOhFvDuaKMMvBtn8fhhfAp62Oq6SvDUSYPOSESU3aS_aXpFU4Yg
87c592f2-814e-4c85-bde9-c9673d6fb531	dce61b1b-24d8-4516-9fc1-c732b0e006dd	priority	100
2a593d38-e428-4e4a-8eb9-9b40c662ab9e	44265dfc-7964-471e-9c62-b1d2c6e9eb53	priority	100
04d939ae-1e0c-4ae7-8530-d1eec5375fb2	44265dfc-7964-471e-9c62-b1d2c6e9eb53	kid	48f54f6e-ef0b-4765-aae1-f8438ab99750
b70c3ad9-f2d3-4475-875b-5a97d9fd873f	44265dfc-7964-471e-9c62-b1d2c6e9eb53	secret	m0cx6OZjyYxNcoHQ3IiqtQ
15ef4ddc-360e-4daa-b494-ef118e14d15d	47956fdb-0f90-4ce8-9d47-c81a91c325b4	privateKey	MIIEogIBAAKCAQEAoQ6xWDzDMXR56c+1D1E2pfDRomze7kbM0ju4ZJp/WGLkYUdNpUME1nzPg03cVKBC/yofRJJ0yWoMjF3hZqx9sqedUA1LyAezk4BYvd6ZQ+1majy+cFurSeRDjWeKTLGDQ8nsMZbVh1oUA2xrA+nWYC/NGHbHj9w20zEM3B1Mz6bXk5/hsIvzKyF74SkIT219/Frox/Q3IFL9w5pCtKEy59438aobjn+umHFYdcX6q3gjKlzodkwBKw7c0ADhnmKN+c4DT+19bZWR2ch3tV2A2/uYlXQkLW745BbqSTLi37FmXKCn7/ox9YQXb2qzq9QLVMqD60pDQWx+8WRlSD/1DwIDAQABAoIBAEv/4GzYY217XqoX4wMi2ixM6seAI2SCEVXla3pBs3T0WXuUB45EBUznYY6+14kxhNvetxmHGMgQnHJCPMJUBA6hbKjhVVDDXZhteLLED0PQC0N3fZAMmdQI/F2GLetJ2rzK1IOD/yfbOFVzPD6BAjGqbNgt+LaoflCDNWPLCbt0afjLY3+AcPGemQNvLXhXa/s2qg8XpmHS20bbAGXc3P8amiFEyA3IQ3jFfgezlD0arenybdwQaQK01fMKy3eKvJPIGfiz8J7GKgzGnBhsHVJcPCU31T/UliUKlwfbaz035j/f3sl3+RlalANvpmYpTMzIBPY2H4LyEfsVmNQYufECgYEA2O3za+rIQyTKMVZGViOunOaTbTLkKnZgCCsAcRnk3TxtWKV/qpD4fzvu9eNu60QeBrMwQQvzzUh1/klrPtq7TnOQh+k89Ipu4VzSiUTDyRQTUW7hk9AO28t75Ws5A3OyxfaorCAg4Ck4FQlPKSpZust96Svpz22Lb+Nji3gykTECgYEAvhCgRLGDTEZd01XkgWjPEohHW79Mm2nQSDuy/F2Hyp3n11TAMfttTlZSZB42OvPZrsLGMOVS5EmXwBv/6HyaFt8FEM63HO7EUuoiGXoIDYMDeJIKkduJepP6cUzuGtX0mzn5d9vDS6LzgKZnv9FANkDNaFIKcU+CgBOXHgAzWj8CgYBCPzitZj/OMXgF5SEJwU/b3pZ7LKV9SjU9iVRTNeMspP2HqtL4FdmtkXICaXhAJMc+qI497xZ/RHe0NluoEEhPRv+GYfYZgAUokZ5CCVv5FkZoAgKlj05aVSP7BemdYkHgLtmH5y/jBPN5iSRBoAtS/j3vbVez3vJMMxb9SrG2oQKBgE7BbOeJ9rHgZnhvmuPUnhk7xvXJauDrE5caxau0xdO7YpnjUFBlsoFHW5SIwEflS0oTAzS3kYVuySadc4jOOLtJZjv0rAOdHFSPF9oeqr+Ojh2jxiVyJqFYN+pCylbsWRMJDsoPkfkBaIziZxMgjc7tQy/67sDNBXI0q+WOh7jZAoGAPkshtu3+br/0ksXyTs6hKb2Rn7p6oXtEIhJGpzhURS7jquKQa4ElVcUt2BtGIyDy88Mf7UIitdnBpP2ZkXTW3W/+Jnvlv3kkgvsVwX6Sj171/4aFShd1me84bXs/ftz9zhyQmoG/Zn5EWpQhtBdEzfIlqJmN/tFbMyir3TFmmHM=
07e26d2d-6f2d-43f3-a01a-f093d7dce4c1	47956fdb-0f90-4ce8-9d47-c81a91c325b4	priority	100
5a4d6584-f0a1-4691-b63d-08d177b4f85a	47956fdb-0f90-4ce8-9d47-c81a91c325b4	certificate	MIICozCCAYsCBgGcv55aUzANBgkqhkiG9w0BAQsFADAVMRMwEQYDVQQDDApwcm9qZWN0aHViMB4XDTI2MDMwNTIwMDczMloXDTM2MDMwNTIwMDkxMlowFTETMBEGA1UEAwwKcHJvamVjdGh1YjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKEOsVg8wzF0eenPtQ9RNqXw0aJs3u5GzNI7uGSaf1hi5GFHTaVDBNZ8z4NN3FSgQv8qH0SSdMlqDIxd4WasfbKnnVANS8gHs5OAWL3emUPtZmo8vnBbq0nkQ41nikyxg0PJ7DGW1YdaFANsawPp1mAvzRh2x4/cNtMxDNwdTM+m15Of4bCL8yshe+EpCE9tffxa6Mf0NyBS/cOaQrShMufeN/GqG45/rphxWHXF+qt4Iypc6HZMASsO3NAA4Z5ijfnOA0/tfW2VkdnId7VdgNv7mJV0JC1u+OQW6kky4t+xZlygp+/6MfWEF29qs6vUC1TKg+tKQ0FsfvFkZUg/9Q8CAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAMLNTOKZLafJqb2NgZyuoJ3NlKb9CbciV1GSpxsU9ol9+D4GfdDh4njeectceU749H2UzhOyB2jqwgkYMpee5gi6Z5VenSoYvCNWV+37TSdUEcG8OB0ZQATsZtToDE8ob98+v/g9FyPFVc1zlpoix/RJGlgX/4f9zm+rsknWIyjaRdk6o5ZWBHZ3oxyZpIJCHKWXAZwJf1EUFF1TU2PMxEzg7oKR6yDyUdq8JAd+0p6UlEeMK2EFFiml3MqNh220xn4jUQgNrfD2w5cueg0Xs/zy3Im/5nzHtfNJjxq5YXrR/NE61wCcG1+tMgOgLBUlJujR9IHQUiGhDHSJo929Y+A==
42eaa698-53b9-4612-98ca-fff1f52d0946	47956fdb-0f90-4ce8-9d47-c81a91c325b4	keyUse	SIG
f1f60fd8-5d07-443f-a499-7d1e6c0148c2	1b6c8dbc-59f0-4355-89f6-2c76626b42f8	algorithm	RSA-OAEP
52cf2259-2467-4fbd-b443-00076bb6d585	1b6c8dbc-59f0-4355-89f6-2c76626b42f8	keyUse	ENC
64b18f40-d94d-4c19-8538-ee82220a0daf	1b6c8dbc-59f0-4355-89f6-2c76626b42f8	certificate	MIICozCCAYsCBgGcv55a4zANBgkqhkiG9w0BAQsFADAVMRMwEQYDVQQDDApwcm9qZWN0aHViMB4XDTI2MDMwNTIwMDczMloXDTM2MDMwNTIwMDkxMlowFTETMBEGA1UEAwwKcHJvamVjdGh1YjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKL2NrG02gcJ8LcESC40dUbYwy0LEVI0iwoJjwVOVaw0IjimGMU6FZWLiuR9YnuFN9Zh81YDQ+UzsgJjNVUu0dIB1suMvjxlmYKvMBVl+N4+CqjOaOqa9i1NEM2wQ3d8YZlJPPFBtTBo0vFjG5Yp9XTlnEwj8twMzyzquI/ra5b3bKM2PvYQqjU6xpD2rFoP+rQrpbzQqF0w4jxX6Wu3TS03U7I/FCb4Z63S3BShjS0En0ly1M4b65SayjylCoTfAMsngwmcJpvLnqUjlHHFFzdBYfqjlBqurWLjPcJ/8fGCR4NWhtpwx3v8qgNX0oOgfA+uSk4pWIexD1S2VZTpWrsCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEANAKffOpNmjHAb4MqGAvflvXK5H4xPPFFUjUMLSe4fQLR0w1ye9d3hDHRZ+v3vIUeAb8w2DaxcLKpOEOYAsYwTWMysZW1lTUD98JUzDmgMic9pFfM0ebkmS0wQ6fwP+qpblAl62LR1ORuQH7zCSbEcFHmI+Z6k6fkggYEKSVCtiUG7z5trA3Pw1AmNIp3yFBBN69c9j+LBXc3v0XGL3XaKPHY6QAyEGHv8mAp1oNGyySgNwd3HCeFyIqDDKiDXqq1E+S2s90D0Inq5Kiy4RZNmePI6scnvljt0oq6XORby5lTMYVrSbiCLzhj44+Y4Hlv5gI1NcqO2sbEtz15RGfJcQ==
024bde0c-e670-405a-9735-5b82ecbe2432	1b6c8dbc-59f0-4355-89f6-2c76626b42f8	priority	100
a51c640f-0b7e-4bac-9919-b7441527a9a5	1b6c8dbc-59f0-4355-89f6-2c76626b42f8	privateKey	MIIEowIBAAKCAQEAovY2sbTaBwnwtwRILjR1RtjDLQsRUjSLCgmPBU5VrDQiOKYYxToVlYuK5H1ie4U31mHzVgND5TOyAmM1VS7R0gHWy4y+PGWZgq8wFWX43j4KqM5o6pr2LU0QzbBDd3xhmUk88UG1MGjS8WMblin1dOWcTCPy3AzPLOq4j+trlvdsozY+9hCqNTrGkPasWg/6tCulvNCoXTDiPFfpa7dNLTdTsj8UJvhnrdLcFKGNLQSfSXLUzhvrlJrKPKUKhN8AyyeDCZwmm8uepSOUccUXN0Fh+qOUGq6tYuM9wn/x8YJHg1aG2nDHe/yqA1fSg6B8D65KTilYh7EPVLZVlOlauwIDAQABAoIBABoN32S+E3W4oyG/r4KjpHR1R482C8jm2av7J0Cj65Kiqy3/cEpoJPdJ3iT13v78p5bBBlSkJQDKKRW0otxBpg47eQoGMIwbelWoiLmDGiz+Ilom1iNcLyvC/ILGQaMi4b/OM84mwT9CIyewvsJdZv8PjtOlk7iW27DEvklUTFlQaB6fJdI2/UnY3c7eLPoNkRmDQrwVED0Fo2VJY7CNFMmx8CyGxWYe6sieVypVroEMGAvVCmfvAD+adGKF+CXYnm0f8wdXIvI4LktlMXE+QFAya5pJ27oL5TrGgHziw/Og6zM8QWQ+Lgp16HNN2z4wlhxQSJddI2TNIgZhnj4s3AECgYEA3ywhVDreOtabUnR41zny651Qiz+ZWqZxCxuhcfXIFBg7bTOUP9qBbvtbs2O6MbPwReTX3vgF14Z4pXnApTHQmhmY7npKpeMYybU9+McC5gJ3H/h4t/DpR1uDce09CEgVljmmKhP2ZFvnE0Dr3TMKYOe4S6Cu+O1MSIH0in6D47sCgYEAuu7Eq8LATNna1QQCy8lqPIG2mIazXLaOky8PRy8o/yiolwe1YsPhnr/TqhExzlXI7MT87WhmgSeGj1v5rymyxiG9fHyycUvNKDZSpxcyJrB/HAYKdm4XtCV7LaAdgtd7emjUKiPFPYh1rsVlGpjcXZbsDaOELTm6K9ZuOFpjdQECgYAT9jiM9i8GiEegWnasmaxW0t1vdyLabuTRn4kTTm61DW3TWLe79ml5adZL93GiHHwzZELC2OB85LRJ6NgIbqo//mYlfp7Ks8N111ZRuEtUE4hgPbNekJftIAxj1lqNMRVtOH7aaKqzU10Z5cazJGubO17KtPaxoVgfbDBZavOVHQKBgA6p7kmfBGDC8jSllOaRjUDj2AQNBQLv2y1Wkrc9ztR9RwRZ+XOe9BL071C2+pY6CoHwTfr9ppTZGegjCeogtkJuoSOj0Iesr5JI+KDc4/U/ASmcm7OAnWFnU0tX9RiveKM4l/QaTD2wd7LXD0BP33GEBk5nllXJ4n3P22OWS5kBAoGBAJi266zABTazNAsdbKlGSrp6qXoysnhA+s0nh/c05rvEkCWJzKyODqy8cJSYP8g+vpfqQ8QV+/Yk+k796I76PJJ5/RUz6dFYW8d2eusMUAqWWl5d7kxTTyYF8IcShN5D9maQOFtUhakuhAjK95s9s+STomM349fkKlTASp8e24y3
5519486c-d147-4924-89d3-62d1f65369b5	e503d53c-fbb7-43ec-8224-fcb87eb178f7	allow-default-scopes	true
ec038a55-c5dc-4b3e-b15b-c2599f56bd2e	6b859079-577e-4af3-b6d2-dfe03b181457	allow-default-scopes	true
4c0eca13-8281-4807-9c5e-733cca351403	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
d85fbefe-0e4f-432d-bfd9-afea24076e3f	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
7e77902a-6087-4997-83f0-e22d08c6389d	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	oidc-full-name-mapper
25e8441f-fe3e-4106-a11f-92674b03e0e3	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	oidc-address-mapper
d1f76750-80ca-442b-a203-e5d2867e6d02	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	saml-user-property-mapper
72e2b349-1a16-4eab-adb0-4f602da849d1	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	saml-user-attribute-mapper
a47350ed-bfec-4625-a765-151f575c43fd	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	saml-role-list-mapper
fc85e396-b70a-4260-9fb3-76f371e3821b	0e575732-2028-437c-999a-edb7835804a8	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
0aaaa001-1dbd-40fc-8907-c850bf665c49	7d06da8a-363a-4662-bd5f-b8a849ebe80e	max-clients	200
04513f4c-39ca-493b-8a54-e64c3bf96ca6	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	oidc-address-mapper
c425accc-1917-4ea4-8582-373eed42baeb	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	saml-role-list-mapper
eec96055-8228-4b82-8dd2-139e5961bc35	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
b08886c1-fc3b-43d6-8732-c36c5fabe9ce	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
447e24a1-3107-40f1-b3e9-b223ec853ed6	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	saml-user-attribute-mapper
9edd5c29-7b20-4cb9-a6a1-334242cd9d0b	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	saml-user-property-mapper
fa30a7d4-7efa-40ab-9318-638a70738d07	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	oidc-full-name-mapper
e1209972-c463-4f16-979f-ee06f3ffff63	e3901623-69d2-41bd-9749-ce4d9227bfbc	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
7c6e5f4e-d7c9-43cb-804b-ff48c191ef8a	53c3e198-18ce-4a1f-8140-c2c10d3bac0c	host-sending-registration-request-must-match	true
21fc4e53-bb22-4aab-a17e-979e57d1aa35	53c3e198-18ce-4a1f-8140-c2c10d3bac0c	client-uris-must-match	true
\.


--
-- Data for Name: composite_role; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.composite_role (composite, child_role) FROM stdin;
5bb963b1-9657-42c9-8954-2c3a31a07699	c84276d9-1372-430d-9a38-a23bc246b80a
5bb963b1-9657-42c9-8954-2c3a31a07699	fee7e6b5-07c8-45bd-a74c-04d5ca951d0a
5bb963b1-9657-42c9-8954-2c3a31a07699	a5e7fa01-ddb3-461c-8134-4cc9c3212736
5bb963b1-9657-42c9-8954-2c3a31a07699	b8bf591e-a2e4-4b89-82ed-0c2c20574e24
5bb963b1-9657-42c9-8954-2c3a31a07699	cdce217e-1d38-4359-b5f2-2f2ddc16c82f
5bb963b1-9657-42c9-8954-2c3a31a07699	0c72d429-b10c-4396-932b-da070fda64dc
5bb963b1-9657-42c9-8954-2c3a31a07699	f57196b8-cd57-4ddc-b75f-09193e6b1d57
5bb963b1-9657-42c9-8954-2c3a31a07699	3d787066-6249-44c2-9b3f-40518202175e
5bb963b1-9657-42c9-8954-2c3a31a07699	4d00372e-7b6e-4b11-975d-f8a6a7a1ecde
5bb963b1-9657-42c9-8954-2c3a31a07699	3271c065-71f1-4e79-b5f4-e87056d25047
5bb963b1-9657-42c9-8954-2c3a31a07699	82cf2f12-75bb-4ea3-b03d-094f97c11ef8
5bb963b1-9657-42c9-8954-2c3a31a07699	a08841f0-400b-4fe5-8b01-a8419ae2884f
5bb963b1-9657-42c9-8954-2c3a31a07699	fe96cd62-c739-4065-8058-9b0eeb5e384d
5bb963b1-9657-42c9-8954-2c3a31a07699	c8463c15-3931-4f9c-b212-c9ea4860fba8
5bb963b1-9657-42c9-8954-2c3a31a07699	1b61aeae-9b44-41a5-b696-507331bd0905
5bb963b1-9657-42c9-8954-2c3a31a07699	e8c05328-c89a-478f-b3e8-75abd8d9d988
5bb963b1-9657-42c9-8954-2c3a31a07699	13b6821d-ba62-4cce-a784-cd5ad947ae9b
5bb963b1-9657-42c9-8954-2c3a31a07699	d2b1e53e-5ed2-4e8c-89f9-cd66a05ab943
12cc11c1-22aa-4e02-b889-c351e7c8007c	e2c70bee-ea70-44eb-8cf2-5d9488a3667a
b8bf591e-a2e4-4b89-82ed-0c2c20574e24	d2b1e53e-5ed2-4e8c-89f9-cd66a05ab943
b8bf591e-a2e4-4b89-82ed-0c2c20574e24	1b61aeae-9b44-41a5-b696-507331bd0905
cdce217e-1d38-4359-b5f2-2f2ddc16c82f	e8c05328-c89a-478f-b3e8-75abd8d9d988
12cc11c1-22aa-4e02-b889-c351e7c8007c	b4aeb7d2-4691-4e28-b713-b8e2514644b3
b4aeb7d2-4691-4e28-b713-b8e2514644b3	b81a5197-7dba-4638-9532-3bdfefd2037c
d6f07163-1f8a-41cb-8ec2-f85cbc6108ce	f89f5b6c-d449-4afe-85bd-3ea2bbd291f4
5bb963b1-9657-42c9-8954-2c3a31a07699	fdc0fdc6-8208-4041-8bda-7455effdf12f
12cc11c1-22aa-4e02-b889-c351e7c8007c	f6839928-9f95-4356-914c-16d7fc3c0dc9
12cc11c1-22aa-4e02-b889-c351e7c8007c	a4b940d3-ee2b-4a8a-bb9b-04ef95060c0a
5bb963b1-9657-42c9-8954-2c3a31a07699	ec22bf26-7b0b-4cce-8a9d-221fec39f0fb
5bb963b1-9657-42c9-8954-2c3a31a07699	a505c6e5-e02b-4209-a47f-155031d25ebd
5bb963b1-9657-42c9-8954-2c3a31a07699	6eaca463-b3b9-48b2-8986-f6931a5071fc
5bb963b1-9657-42c9-8954-2c3a31a07699	5f706167-bddc-4406-8bf4-7c44739625ec
5bb963b1-9657-42c9-8954-2c3a31a07699	19b9371d-788d-42ab-9bdc-b4173c992c87
5bb963b1-9657-42c9-8954-2c3a31a07699	70232603-0058-45bf-8673-6c742f11a07d
5bb963b1-9657-42c9-8954-2c3a31a07699	7a7a8911-069d-4c75-9cb7-2777b0e543a4
5bb963b1-9657-42c9-8954-2c3a31a07699	de53c114-428f-442a-9235-e3359f156e95
5bb963b1-9657-42c9-8954-2c3a31a07699	80634488-0368-4d9f-8dce-2b37ad958447
5bb963b1-9657-42c9-8954-2c3a31a07699	ca44eb80-79aa-4b2f-88de-5ea37c64dbce
5bb963b1-9657-42c9-8954-2c3a31a07699	1f0ef04e-3cd9-4a53-9642-f47ae0da0bec
5bb963b1-9657-42c9-8954-2c3a31a07699	754584d3-3ce4-44bb-b9d6-8003e4a76df1
5bb963b1-9657-42c9-8954-2c3a31a07699	436b59c6-aae6-42f2-8b8c-940627a8b24c
5bb963b1-9657-42c9-8954-2c3a31a07699	5da57500-29f1-43b0-9fe5-52ed147149c7
5bb963b1-9657-42c9-8954-2c3a31a07699	636e94d4-3d41-47de-b3e6-c9e90158b020
5bb963b1-9657-42c9-8954-2c3a31a07699	0fd8c972-e225-4a7a-a63e-1d5b64afb09e
5bb963b1-9657-42c9-8954-2c3a31a07699	bb2a5d0e-a8c2-4d15-9f44-e362204733d8
5f706167-bddc-4406-8bf4-7c44739625ec	636e94d4-3d41-47de-b3e6-c9e90158b020
6eaca463-b3b9-48b2-8986-f6931a5071fc	5da57500-29f1-43b0-9fe5-52ed147149c7
6eaca463-b3b9-48b2-8986-f6931a5071fc	bb2a5d0e-a8c2-4d15-9f44-e362204733d8
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	76893a2d-e27c-459c-a2be-a8d2a416c972
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	e5698b4c-1269-469c-ba30-51c6fa0ac1ed
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	7abe989b-59a7-4eb2-9c86-b3c6d73a4f43
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	c7332b67-a988-465b-bbbe-8c2dc2566536
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	3d43ccd9-4f27-4d75-93c7-56e31d27af52
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	9baa2167-1c12-4eba-94c6-a355e2ebd4d5
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	c4344af9-b777-4d2c-a64a-d88f7347387a
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	6d4c00d8-e43b-4fe9-b756-8efd42a2c07a
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	a2e76a8a-ffba-4f0b-8dc0-1fd1969d03d6
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	f334cb4c-e95e-473d-aeea-df441a839ae1
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	a4971718-a4c2-4776-8503-9e5d535b05dc
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	52ac97b0-f96c-4f11-9d21-f14b7ad4587d
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	4c458fe4-d479-4b1a-a455-d59e58a19675
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	b62eae55-7e93-4f4b-b59b-027b4f066fe1
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	235012e1-7b4b-4bd1-8ca5-4de887322569
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	334505a3-e3d9-4fc5-aa68-0ba9e7250447
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	2420d973-a2a0-41fe-aae6-2a9112ef98e0
158ee450-2830-4a46-ad19-6ebacc1712f5	0c216cbd-a80d-4e0f-b7f0-93be1e3cd134
7abe989b-59a7-4eb2-9c86-b3c6d73a4f43	2420d973-a2a0-41fe-aae6-2a9112ef98e0
7abe989b-59a7-4eb2-9c86-b3c6d73a4f43	b62eae55-7e93-4f4b-b59b-027b4f066fe1
c7332b67-a988-465b-bbbe-8c2dc2566536	235012e1-7b4b-4bd1-8ca5-4de887322569
158ee450-2830-4a46-ad19-6ebacc1712f5	22828d60-b96e-400c-b666-290f0114b2a2
22828d60-b96e-400c-b666-290f0114b2a2	12161bc9-8f8d-4f04-b4e1-99854b1a2206
3cb1fd0c-b1b9-49a9-9125-84e41e82df78	c9a49995-ecf0-4e11-a879-1541cfb41c8b
5bb963b1-9657-42c9-8954-2c3a31a07699	a17a3ae8-eeae-44e2-a8f4-4165b273e30d
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	d202bf79-6248-445b-88d3-dea849ab2e03
158ee450-2830-4a46-ad19-6ebacc1712f5	a7377c7e-a2d6-4cc2-844b-ddbb4e1904cb
158ee450-2830-4a46-ad19-6ebacc1712f5	e9e911b6-d223-43a3-bdc7-603f1427f4cb
\.


--
-- Data for Name: credential; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.credential (id, salt, type, user_id, created_date, user_label, secret_data, credential_data, priority) FROM stdin;
ded096b7-5756-4c12-b6a9-d485003e06b1	\N	password	d38a8142-1fac-48e9-a850-20049175f826	1772741096416	\N	{"value":"Q2nTf14YOX2B9uXp09qx5/O9KJvhqOPXNvOhFjZnzVk=","salt":"owvpSWIqT6ws94ol0woFRQ==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
cea7f699-7349-4054-905b-d46db05deca6	\N	password	d481ca75-1625-450a-89fe-1604b7844b46	1773083745847	My password	{"value":"EDRQe5Fk/F8640dMitHCVe16YvSX73zydxhpiSjkyEk=","salt":"9MMRUXU6Dq/oy0Br5fcFow==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
e6be7ad0-a4ce-49e7-bdb0-9da694b75958	\N	password	b04ef91d-8152-46a2-8a2a-e9628c7d3d94	1773238023730	My password	{"value":"8OtHlVPbKwQDOvYsKSjO6nW5ghj7TUnJTLkT+KHSYXs=","salt":"PhQnVPhrumZkUeqe79x+RQ==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
4a994257-5f75-4454-82f3-2e1fecd30435	\N	password	91e0f549-d6c6-4f79-8bdf-15491558489f	1773238095903	My password	{"value":"9oMa9bWt/Vmk7J2D+SGdZUZsrw3HaiK1639rYqrOByE=","salt":"2N3Yf/8wptM06V4HqdotbA==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
5e67f8ac-8fef-46df-bd60-d81b338e35b3	\N	password	8b60bf40-c45d-4481-b24b-36690db0da20	1773243401996	My password	{"value":"+rS2xTbtSGIdmmH2G+ZIonz02hd01MYwATZTYPqIQXA=","salt":"0zyqx9tA0Cf3+0nMZ/GTYw==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
064e576e-7085-4d73-8e7b-b7453ecb5fd6	\N	password	bfb99526-9e71-420c-8b1a-4a1dbaf64dc1	1775483098896	My password	{"value":"WG2Gr/u7bwxyExRDxVSJr4+laimIFAKBF8VHxGWtf9k=","salt":"aWy5OE3Kum9h08Gr1t19QA==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
\.


--
-- Data for Name: databasechangelog; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, comments, tag, liquibase, contexts, labels, deployment_id) FROM stdin;
1.0.0.Final-KEYCLOAK-5461	sthorger@redhat.com	META-INF/jpa-changelog-1.0.0.Final.xml	2026-03-05 20:04:52.780033	1	EXECUTED	9:6f1016664e21e16d26517a4418f5e3df	createTable tableName=APPLICATION_DEFAULT_ROLES; createTable tableName=CLIENT; createTable tableName=CLIENT_SESSION; createTable tableName=CLIENT_SESSION_ROLE; createTable tableName=COMPOSITE_ROLE; createTable tableName=CREDENTIAL; createTable tab...		\N	4.23.2	\N	\N	2741092203
1.0.0.Final-KEYCLOAK-5461	sthorger@redhat.com	META-INF/db2-jpa-changelog-1.0.0.Final.xml	2026-03-05 20:04:52.808094	2	MARK_RAN	9:828775b1596a07d1200ba1d49e5e3941	createTable tableName=APPLICATION_DEFAULT_ROLES; createTable tableName=CLIENT; createTable tableName=CLIENT_SESSION; createTable tableName=CLIENT_SESSION_ROLE; createTable tableName=COMPOSITE_ROLE; createTable tableName=CREDENTIAL; createTable tab...		\N	4.23.2	\N	\N	2741092203
1.1.0.Beta1	sthorger@redhat.com	META-INF/jpa-changelog-1.1.0.Beta1.xml	2026-03-05 20:04:52.852398	3	EXECUTED	9:5f090e44a7d595883c1fb61f4b41fd38	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=CLIENT_ATTRIBUTES; createTable tableName=CLIENT_SESSION_NOTE; createTable tableName=APP_NODE_REGISTRATIONS; addColumn table...		\N	4.23.2	\N	\N	2741092203
1.1.0.Final	sthorger@redhat.com	META-INF/jpa-changelog-1.1.0.Final.xml	2026-03-05 20:04:52.85763	4	EXECUTED	9:c07e577387a3d2c04d1adc9aaad8730e	renameColumn newColumnName=EVENT_TIME, oldColumnName=TIME, tableName=EVENT_ENTITY		\N	4.23.2	\N	\N	2741092203
1.2.0.Beta1	psilva@redhat.com	META-INF/jpa-changelog-1.2.0.Beta1.xml	2026-03-05 20:04:52.980057	5	EXECUTED	9:b68ce996c655922dbcd2fe6b6ae72686	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=PROTOCOL_MAPPER; createTable tableName=PROTOCOL_MAPPER_CONFIG; createTable tableName=...		\N	4.23.2	\N	\N	2741092203
1.2.0.Beta1	psilva@redhat.com	META-INF/db2-jpa-changelog-1.2.0.Beta1.xml	2026-03-05 20:04:52.992026	6	MARK_RAN	9:543b5c9989f024fe35c6f6c5a97de88e	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=PROTOCOL_MAPPER; createTable tableName=PROTOCOL_MAPPER_CONFIG; createTable tableName=...		\N	4.23.2	\N	\N	2741092203
1.2.0.RC1	bburke@redhat.com	META-INF/jpa-changelog-1.2.0.CR1.xml	2026-03-05 20:04:53.093773	7	EXECUTED	9:765afebbe21cf5bbca048e632df38336	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=MIGRATION_MODEL; createTable tableName=IDENTITY_P...		\N	4.23.2	\N	\N	2741092203
1.2.0.RC1	bburke@redhat.com	META-INF/db2-jpa-changelog-1.2.0.CR1.xml	2026-03-05 20:04:53.107601	8	MARK_RAN	9:db4a145ba11a6fdaefb397f6dbf829a1	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=MIGRATION_MODEL; createTable tableName=IDENTITY_P...		\N	4.23.2	\N	\N	2741092203
1.2.0.Final	keycloak	META-INF/jpa-changelog-1.2.0.Final.xml	2026-03-05 20:04:53.114213	9	EXECUTED	9:9d05c7be10cdb873f8bcb41bc3a8ab23	update tableName=CLIENT; update tableName=CLIENT; update tableName=CLIENT		\N	4.23.2	\N	\N	2741092203
1.3.0	bburke@redhat.com	META-INF/jpa-changelog-1.3.0.xml	2026-03-05 20:04:53.224775	10	EXECUTED	9:18593702353128d53111f9b1ff0b82b8	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=ADMI...		\N	4.23.2	\N	\N	2741092203
1.4.0	bburke@redhat.com	META-INF/jpa-changelog-1.4.0.xml	2026-03-05 20:04:53.283018	11	EXECUTED	9:6122efe5f090e41a85c0f1c9e52cbb62	delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...		\N	4.23.2	\N	\N	2741092203
1.4.0	bburke@redhat.com	META-INF/db2-jpa-changelog-1.4.0.xml	2026-03-05 20:04:53.290256	12	MARK_RAN	9:e1ff28bf7568451453f844c5d54bb0b5	delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...		\N	4.23.2	\N	\N	2741092203
1.5.0	bburke@redhat.com	META-INF/jpa-changelog-1.5.0.xml	2026-03-05 20:04:53.306433	13	EXECUTED	9:7af32cd8957fbc069f796b61217483fd	delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...		\N	4.23.2	\N	\N	2741092203
1.6.1_from15	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-03-05 20:04:53.331594	14	EXECUTED	9:6005e15e84714cd83226bf7879f54190	addColumn tableName=REALM; addColumn tableName=KEYCLOAK_ROLE; addColumn tableName=CLIENT; createTable tableName=OFFLINE_USER_SESSION; createTable tableName=OFFLINE_CLIENT_SESSION; addPrimaryKey constraintName=CONSTRAINT_OFFL_US_SES_PK2, tableName=...		\N	4.23.2	\N	\N	2741092203
1.6.1_from16-pre	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-03-05 20:04:53.334112	15	MARK_RAN	9:bf656f5a2b055d07f314431cae76f06c	delete tableName=OFFLINE_CLIENT_SESSION; delete tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	2741092203
1.6.1_from16	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-03-05 20:04:53.337421	16	MARK_RAN	9:f8dadc9284440469dcf71e25ca6ab99b	dropPrimaryKey constraintName=CONSTRAINT_OFFLINE_US_SES_PK, tableName=OFFLINE_USER_SESSION; dropPrimaryKey constraintName=CONSTRAINT_OFFLINE_CL_SES_PK, tableName=OFFLINE_CLIENT_SESSION; addColumn tableName=OFFLINE_USER_SESSION; update tableName=OF...		\N	4.23.2	\N	\N	2741092203
1.6.1	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-03-05 20:04:53.340625	17	EXECUTED	9:d41d8cd98f00b204e9800998ecf8427e	empty		\N	4.23.2	\N	\N	2741092203
1.7.0	bburke@redhat.com	META-INF/jpa-changelog-1.7.0.xml	2026-03-05 20:04:53.398717	18	EXECUTED	9:3368ff0be4c2855ee2dd9ca813b38d8e	createTable tableName=KEYCLOAK_GROUP; createTable tableName=GROUP_ROLE_MAPPING; createTable tableName=GROUP_ATTRIBUTE; createTable tableName=USER_GROUP_MEMBERSHIP; createTable tableName=REALM_DEFAULT_GROUPS; addColumn tableName=IDENTITY_PROVIDER; ...		\N	4.23.2	\N	\N	2741092203
1.8.0	mposolda@redhat.com	META-INF/jpa-changelog-1.8.0.xml	2026-03-05 20:04:53.45685	19	EXECUTED	9:8ac2fb5dd030b24c0570a763ed75ed20	addColumn tableName=IDENTITY_PROVIDER; createTable tableName=CLIENT_TEMPLATE; createTable tableName=CLIENT_TEMPLATE_ATTRIBUTES; createTable tableName=TEMPLATE_SCOPE_MAPPING; dropNotNullConstraint columnName=CLIENT_ID, tableName=PROTOCOL_MAPPER; ad...		\N	4.23.2	\N	\N	2741092203
1.8.0-2	keycloak	META-INF/jpa-changelog-1.8.0.xml	2026-03-05 20:04:53.463073	20	EXECUTED	9:f91ddca9b19743db60e3057679810e6c	dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; update tableName=CREDENTIAL		\N	4.23.2	\N	\N	2741092203
1.8.0	mposolda@redhat.com	META-INF/db2-jpa-changelog-1.8.0.xml	2026-03-05 20:04:53.470394	21	MARK_RAN	9:831e82914316dc8a57dc09d755f23c51	addColumn tableName=IDENTITY_PROVIDER; createTable tableName=CLIENT_TEMPLATE; createTable tableName=CLIENT_TEMPLATE_ATTRIBUTES; createTable tableName=TEMPLATE_SCOPE_MAPPING; dropNotNullConstraint columnName=CLIENT_ID, tableName=PROTOCOL_MAPPER; ad...		\N	4.23.2	\N	\N	2741092203
1.8.0-2	keycloak	META-INF/db2-jpa-changelog-1.8.0.xml	2026-03-05 20:04:53.474523	22	MARK_RAN	9:f91ddca9b19743db60e3057679810e6c	dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; update tableName=CREDENTIAL		\N	4.23.2	\N	\N	2741092203
1.9.0	mposolda@redhat.com	META-INF/jpa-changelog-1.9.0.xml	2026-03-05 20:04:53.498875	23	EXECUTED	9:bc3d0f9e823a69dc21e23e94c7a94bb1	update tableName=REALM; update tableName=REALM; update tableName=REALM; update tableName=REALM; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=REALM; update tableName=REALM; customChange; dr...		\N	4.23.2	\N	\N	2741092203
1.9.1	keycloak	META-INF/jpa-changelog-1.9.1.xml	2026-03-05 20:04:53.505269	24	EXECUTED	9:c9999da42f543575ab790e76439a2679	modifyDataType columnName=PRIVATE_KEY, tableName=REALM; modifyDataType columnName=PUBLIC_KEY, tableName=REALM; modifyDataType columnName=CERTIFICATE, tableName=REALM		\N	4.23.2	\N	\N	2741092203
1.9.1	keycloak	META-INF/db2-jpa-changelog-1.9.1.xml	2026-03-05 20:04:53.507683	25	MARK_RAN	9:0d6c65c6f58732d81569e77b10ba301d	modifyDataType columnName=PRIVATE_KEY, tableName=REALM; modifyDataType columnName=CERTIFICATE, tableName=REALM		\N	4.23.2	\N	\N	2741092203
1.9.2	keycloak	META-INF/jpa-changelog-1.9.2.xml	2026-03-05 20:04:53.557716	26	EXECUTED	9:fc576660fc016ae53d2d4778d84d86d0	createIndex indexName=IDX_USER_EMAIL, tableName=USER_ENTITY; createIndex indexName=IDX_USER_ROLE_MAPPING, tableName=USER_ROLE_MAPPING; createIndex indexName=IDX_USER_GROUP_MAPPING, tableName=USER_GROUP_MEMBERSHIP; createIndex indexName=IDX_USER_CO...		\N	4.23.2	\N	\N	2741092203
authz-2.0.0	psilva@redhat.com	META-INF/jpa-changelog-authz-2.0.0.xml	2026-03-05 20:04:53.657319	27	EXECUTED	9:43ed6b0da89ff77206289e87eaa9c024	createTable tableName=RESOURCE_SERVER; addPrimaryKey constraintName=CONSTRAINT_FARS, tableName=RESOURCE_SERVER; addUniqueConstraint constraintName=UK_AU8TT6T700S9V50BU18WS5HA6, tableName=RESOURCE_SERVER; createTable tableName=RESOURCE_SERVER_RESOU...		\N	4.23.2	\N	\N	2741092203
authz-2.5.1	psilva@redhat.com	META-INF/jpa-changelog-authz-2.5.1.xml	2026-03-05 20:04:53.661573	28	EXECUTED	9:44bae577f551b3738740281eceb4ea70	update tableName=RESOURCE_SERVER_POLICY		\N	4.23.2	\N	\N	2741092203
2.1.0-KEYCLOAK-5461	bburke@redhat.com	META-INF/jpa-changelog-2.1.0.xml	2026-03-05 20:04:53.748507	29	EXECUTED	9:bd88e1f833df0420b01e114533aee5e8	createTable tableName=BROKER_LINK; createTable tableName=FED_USER_ATTRIBUTE; createTable tableName=FED_USER_CONSENT; createTable tableName=FED_USER_CONSENT_ROLE; createTable tableName=FED_USER_CONSENT_PROT_MAPPER; createTable tableName=FED_USER_CR...		\N	4.23.2	\N	\N	2741092203
2.2.0	bburke@redhat.com	META-INF/jpa-changelog-2.2.0.xml	2026-03-05 20:04:53.767685	30	EXECUTED	9:a7022af5267f019d020edfe316ef4371	addColumn tableName=ADMIN_EVENT_ENTITY; createTable tableName=CREDENTIAL_ATTRIBUTE; createTable tableName=FED_CREDENTIAL_ATTRIBUTE; modifyDataType columnName=VALUE, tableName=CREDENTIAL; addForeignKeyConstraint baseTableName=FED_CREDENTIAL_ATTRIBU...		\N	4.23.2	\N	\N	2741092203
2.3.0	bburke@redhat.com	META-INF/jpa-changelog-2.3.0.xml	2026-03-05 20:04:53.786796	31	EXECUTED	9:fc155c394040654d6a79227e56f5e25a	createTable tableName=FEDERATED_USER; addPrimaryKey constraintName=CONSTR_FEDERATED_USER, tableName=FEDERATED_USER; dropDefaultValue columnName=TOTP, tableName=USER_ENTITY; dropColumn columnName=TOTP, tableName=USER_ENTITY; addColumn tableName=IDE...		\N	4.23.2	\N	\N	2741092203
2.4.0	bburke@redhat.com	META-INF/jpa-changelog-2.4.0.xml	2026-03-05 20:04:53.791332	32	EXECUTED	9:eac4ffb2a14795e5dc7b426063e54d88	customChange		\N	4.23.2	\N	\N	2741092203
2.5.0	bburke@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-03-05 20:04:53.797533	33	EXECUTED	9:54937c05672568c4c64fc9524c1e9462	customChange; modifyDataType columnName=USER_ID, tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	2741092203
2.5.0-unicode-oracle	hmlnarik@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-03-05 20:04:53.800705	34	MARK_RAN	9:3a32bace77c84d7678d035a7f5a8084e	modifyDataType columnName=DESCRIPTION, tableName=AUTHENTICATION_FLOW; modifyDataType columnName=DESCRIPTION, tableName=CLIENT_TEMPLATE; modifyDataType columnName=DESCRIPTION, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=DESCRIPTION,...		\N	4.23.2	\N	\N	2741092203
2.5.0-unicode-other-dbs	hmlnarik@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-03-05 20:04:53.833686	35	EXECUTED	9:33d72168746f81f98ae3a1e8e0ca3554	modifyDataType columnName=DESCRIPTION, tableName=AUTHENTICATION_FLOW; modifyDataType columnName=DESCRIPTION, tableName=CLIENT_TEMPLATE; modifyDataType columnName=DESCRIPTION, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=DESCRIPTION,...		\N	4.23.2	\N	\N	2741092203
2.5.0-duplicate-email-support	slawomir@dabek.name	META-INF/jpa-changelog-2.5.0.xml	2026-03-05 20:04:53.839716	36	EXECUTED	9:61b6d3d7a4c0e0024b0c839da283da0c	addColumn tableName=REALM		\N	4.23.2	\N	\N	2741092203
2.5.0-unique-group-names	hmlnarik@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-03-05 20:04:53.848346	37	EXECUTED	9:8dcac7bdf7378e7d823cdfddebf72fda	addUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	2741092203
2.5.1	bburke@redhat.com	META-INF/jpa-changelog-2.5.1.xml	2026-03-05 20:04:53.853065	38	EXECUTED	9:a2b870802540cb3faa72098db5388af3	addColumn tableName=FED_USER_CONSENT		\N	4.23.2	\N	\N	2741092203
3.0.0	bburke@redhat.com	META-INF/jpa-changelog-3.0.0.xml	2026-03-05 20:04:53.857597	39	EXECUTED	9:132a67499ba24bcc54fb5cbdcfe7e4c0	addColumn tableName=IDENTITY_PROVIDER		\N	4.23.2	\N	\N	2741092203
3.2.0-fix	keycloak	META-INF/jpa-changelog-3.2.0.xml	2026-03-05 20:04:53.85974	40	MARK_RAN	9:938f894c032f5430f2b0fafb1a243462	addNotNullConstraint columnName=REALM_ID, tableName=CLIENT_INITIAL_ACCESS		\N	4.23.2	\N	\N	2741092203
3.2.0-fix-with-keycloak-5416	keycloak	META-INF/jpa-changelog-3.2.0.xml	2026-03-05 20:04:53.862456	41	MARK_RAN	9:845c332ff1874dc5d35974b0babf3006	dropIndex indexName=IDX_CLIENT_INIT_ACC_REALM, tableName=CLIENT_INITIAL_ACCESS; addNotNullConstraint columnName=REALM_ID, tableName=CLIENT_INITIAL_ACCESS; createIndex indexName=IDX_CLIENT_INIT_ACC_REALM, tableName=CLIENT_INITIAL_ACCESS		\N	4.23.2	\N	\N	2741092203
3.2.0-fix-offline-sessions	hmlnarik	META-INF/jpa-changelog-3.2.0.xml	2026-03-05 20:04:53.867054	42	EXECUTED	9:fc86359c079781adc577c5a217e4d04c	customChange		\N	4.23.2	\N	\N	2741092203
3.2.0-fixed	keycloak	META-INF/jpa-changelog-3.2.0.xml	2026-03-05 20:04:54.071609	43	EXECUTED	9:59a64800e3c0d09b825f8a3b444fa8f4	addColumn tableName=REALM; dropPrimaryKey constraintName=CONSTRAINT_OFFL_CL_SES_PK2, tableName=OFFLINE_CLIENT_SESSION; dropColumn columnName=CLIENT_SESSION_ID, tableName=OFFLINE_CLIENT_SESSION; addPrimaryKey constraintName=CONSTRAINT_OFFL_CL_SES_P...		\N	4.23.2	\N	\N	2741092203
3.3.0	keycloak	META-INF/jpa-changelog-3.3.0.xml	2026-03-05 20:04:54.077378	44	EXECUTED	9:d48d6da5c6ccf667807f633fe489ce88	addColumn tableName=USER_ENTITY		\N	4.23.2	\N	\N	2741092203
authz-3.4.0.CR1-resource-server-pk-change-part1	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-03-05 20:04:54.082779	45	EXECUTED	9:dde36f7973e80d71fceee683bc5d2951	addColumn tableName=RESOURCE_SERVER_POLICY; addColumn tableName=RESOURCE_SERVER_RESOURCE; addColumn tableName=RESOURCE_SERVER_SCOPE		\N	4.23.2	\N	\N	2741092203
authz-3.4.0.CR1-resource-server-pk-change-part2-KEYCLOAK-6095	hmlnarik@redhat.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-03-05 20:04:54.087131	46	EXECUTED	9:b855e9b0a406b34fa323235a0cf4f640	customChange		\N	4.23.2	\N	\N	2741092203
authz-3.4.0.CR1-resource-server-pk-change-part3-fixed	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-03-05 20:04:54.089575	47	MARK_RAN	9:51abbacd7b416c50c4421a8cabf7927e	dropIndex indexName=IDX_RES_SERV_POL_RES_SERV, tableName=RESOURCE_SERVER_POLICY; dropIndex indexName=IDX_RES_SRV_RES_RES_SRV, tableName=RESOURCE_SERVER_RESOURCE; dropIndex indexName=IDX_RES_SRV_SCOPE_RES_SRV, tableName=RESOURCE_SERVER_SCOPE		\N	4.23.2	\N	\N	2741092203
authz-3.4.0.CR1-resource-server-pk-change-part3-fixed-nodropindex	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-03-05 20:04:54.140242	48	EXECUTED	9:bdc99e567b3398bac83263d375aad143	addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, tableName=RESOURCE_SERVER_POLICY; addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, tableName=RESOURCE_SERVER_RESOURCE; addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, ...		\N	4.23.2	\N	\N	2741092203
authn-3.4.0.CR1-refresh-token-max-reuse	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-03-05 20:04:54.145863	49	EXECUTED	9:d198654156881c46bfba39abd7769e69	addColumn tableName=REALM		\N	4.23.2	\N	\N	2741092203
3.4.0	keycloak	META-INF/jpa-changelog-3.4.0.xml	2026-03-05 20:04:54.209887	50	EXECUTED	9:cfdd8736332ccdd72c5256ccb42335db	addPrimaryKey constraintName=CONSTRAINT_REALM_DEFAULT_ROLES, tableName=REALM_DEFAULT_ROLES; addPrimaryKey constraintName=CONSTRAINT_COMPOSITE_ROLE, tableName=COMPOSITE_ROLE; addPrimaryKey constraintName=CONSTR_REALM_DEFAULT_GROUPS, tableName=REALM...		\N	4.23.2	\N	\N	2741092203
3.4.0-KEYCLOAK-5230	hmlnarik@redhat.com	META-INF/jpa-changelog-3.4.0.xml	2026-03-05 20:04:54.26101	51	EXECUTED	9:7c84de3d9bd84d7f077607c1a4dcb714	createIndex indexName=IDX_FU_ATTRIBUTE, tableName=FED_USER_ATTRIBUTE; createIndex indexName=IDX_FU_CONSENT, tableName=FED_USER_CONSENT; createIndex indexName=IDX_FU_CONSENT_RU, tableName=FED_USER_CONSENT; createIndex indexName=IDX_FU_CREDENTIAL, t...		\N	4.23.2	\N	\N	2741092203
3.4.1	psilva@redhat.com	META-INF/jpa-changelog-3.4.1.xml	2026-03-05 20:04:54.265775	52	EXECUTED	9:5a6bb36cbefb6a9d6928452c0852af2d	modifyDataType columnName=VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	2741092203
3.4.2	keycloak	META-INF/jpa-changelog-3.4.2.xml	2026-03-05 20:04:54.26949	53	EXECUTED	9:8f23e334dbc59f82e0a328373ca6ced0	update tableName=REALM		\N	4.23.2	\N	\N	2741092203
3.4.2-KEYCLOAK-5172	mkanis@redhat.com	META-INF/jpa-changelog-3.4.2.xml	2026-03-05 20:04:54.273177	54	EXECUTED	9:9156214268f09d970cdf0e1564d866af	update tableName=CLIENT		\N	4.23.2	\N	\N	2741092203
4.0.0-KEYCLOAK-6335	bburke@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-03-05 20:04:54.282042	55	EXECUTED	9:db806613b1ed154826c02610b7dbdf74	createTable tableName=CLIENT_AUTH_FLOW_BINDINGS; addPrimaryKey constraintName=C_CLI_FLOW_BIND, tableName=CLIENT_AUTH_FLOW_BINDINGS		\N	4.23.2	\N	\N	2741092203
4.0.0-CLEANUP-UNUSED-TABLE	bburke@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-03-05 20:04:54.288721	56	EXECUTED	9:229a041fb72d5beac76bb94a5fa709de	dropTable tableName=CLIENT_IDENTITY_PROV_MAPPING		\N	4.23.2	\N	\N	2741092203
4.0.0-KEYCLOAK-6228	bburke@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-03-05 20:04:54.314588	57	EXECUTED	9:079899dade9c1e683f26b2aa9ca6ff04	dropUniqueConstraint constraintName=UK_JKUWUVD56ONTGSUHOGM8UEWRT, tableName=USER_CONSENT; dropNotNullConstraint columnName=CLIENT_ID, tableName=USER_CONSENT; addColumn tableName=USER_CONSENT; addUniqueConstraint constraintName=UK_JKUWUVD56ONTGSUHO...		\N	4.23.2	\N	\N	2741092203
4.0.0-KEYCLOAK-5579-fixed	mposolda@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-03-05 20:04:54.43655	58	EXECUTED	9:139b79bcbbfe903bb1c2d2a4dbf001d9	dropForeignKeyConstraint baseTableName=CLIENT_TEMPLATE_ATTRIBUTES, constraintName=FK_CL_TEMPL_ATTR_TEMPL; renameTable newTableName=CLIENT_SCOPE_ATTRIBUTES, oldTableName=CLIENT_TEMPLATE_ATTRIBUTES; renameColumn newColumnName=SCOPE_ID, oldColumnName...		\N	4.23.2	\N	\N	2741092203
authz-4.0.0.CR1	psilva@redhat.com	META-INF/jpa-changelog-authz-4.0.0.CR1.xml	2026-03-05 20:04:54.472109	59	EXECUTED	9:b55738ad889860c625ba2bf483495a04	createTable tableName=RESOURCE_SERVER_PERM_TICKET; addPrimaryKey constraintName=CONSTRAINT_FAPMT, tableName=RESOURCE_SERVER_PERM_TICKET; addForeignKeyConstraint baseTableName=RESOURCE_SERVER_PERM_TICKET, constraintName=FK_FRSRHO213XCX4WNKOG82SSPMT...		\N	4.23.2	\N	\N	2741092203
authz-4.0.0.Beta3	psilva@redhat.com	META-INF/jpa-changelog-authz-4.0.0.Beta3.xml	2026-03-05 20:04:54.47967	60	EXECUTED	9:e0057eac39aa8fc8e09ac6cfa4ae15fe	addColumn tableName=RESOURCE_SERVER_POLICY; addColumn tableName=RESOURCE_SERVER_PERM_TICKET; addForeignKeyConstraint baseTableName=RESOURCE_SERVER_PERM_TICKET, constraintName=FK_FRSRPO2128CX4WNKOG82SSRFY, referencedTableName=RESOURCE_SERVER_POLICY		\N	4.23.2	\N	\N	2741092203
authz-4.2.0.Final	mhajas@redhat.com	META-INF/jpa-changelog-authz-4.2.0.Final.xml	2026-03-05 20:04:54.487982	61	EXECUTED	9:42a33806f3a0443fe0e7feeec821326c	createTable tableName=RESOURCE_URIS; addForeignKeyConstraint baseTableName=RESOURCE_URIS, constraintName=FK_RESOURCE_SERVER_URIS, referencedTableName=RESOURCE_SERVER_RESOURCE; customChange; dropColumn columnName=URI, tableName=RESOURCE_SERVER_RESO...		\N	4.23.2	\N	\N	2741092203
authz-4.2.0.Final-KEYCLOAK-9944	hmlnarik@redhat.com	META-INF/jpa-changelog-authz-4.2.0.Final.xml	2026-03-05 20:04:54.496693	62	EXECUTED	9:9968206fca46eecc1f51db9c024bfe56	addPrimaryKey constraintName=CONSTRAINT_RESOUR_URIS_PK, tableName=RESOURCE_URIS		\N	4.23.2	\N	\N	2741092203
4.2.0-KEYCLOAK-6313	wadahiro@gmail.com	META-INF/jpa-changelog-4.2.0.xml	2026-03-05 20:04:54.50116	63	EXECUTED	9:92143a6daea0a3f3b8f598c97ce55c3d	addColumn tableName=REQUIRED_ACTION_PROVIDER		\N	4.23.2	\N	\N	2741092203
4.3.0-KEYCLOAK-7984	wadahiro@gmail.com	META-INF/jpa-changelog-4.3.0.xml	2026-03-05 20:04:54.505555	64	EXECUTED	9:82bab26a27195d889fb0429003b18f40	update tableName=REQUIRED_ACTION_PROVIDER		\N	4.23.2	\N	\N	2741092203
4.6.0-KEYCLOAK-7950	psilva@redhat.com	META-INF/jpa-changelog-4.6.0.xml	2026-03-05 20:04:54.509131	65	EXECUTED	9:e590c88ddc0b38b0ae4249bbfcb5abc3	update tableName=RESOURCE_SERVER_RESOURCE		\N	4.23.2	\N	\N	2741092203
4.6.0-KEYCLOAK-8377	keycloak	META-INF/jpa-changelog-4.6.0.xml	2026-03-05 20:04:54.529857	66	EXECUTED	9:5c1f475536118dbdc38d5d7977950cc0	createTable tableName=ROLE_ATTRIBUTE; addPrimaryKey constraintName=CONSTRAINT_ROLE_ATTRIBUTE_PK, tableName=ROLE_ATTRIBUTE; addForeignKeyConstraint baseTableName=ROLE_ATTRIBUTE, constraintName=FK_ROLE_ATTRIBUTE_ID, referencedTableName=KEYCLOAK_ROLE...		\N	4.23.2	\N	\N	2741092203
4.6.0-KEYCLOAK-8555	gideonray@gmail.com	META-INF/jpa-changelog-4.6.0.xml	2026-03-05 20:04:54.538217	67	EXECUTED	9:e7c9f5f9c4d67ccbbcc215440c718a17	createIndex indexName=IDX_COMPONENT_PROVIDER_TYPE, tableName=COMPONENT		\N	4.23.2	\N	\N	2741092203
4.7.0-KEYCLOAK-1267	sguilhen@redhat.com	META-INF/jpa-changelog-4.7.0.xml	2026-03-05 20:04:54.543493	68	EXECUTED	9:88e0bfdda924690d6f4e430c53447dd5	addColumn tableName=REALM		\N	4.23.2	\N	\N	2741092203
4.7.0-KEYCLOAK-7275	keycloak	META-INF/jpa-changelog-4.7.0.xml	2026-03-05 20:04:54.554561	69	EXECUTED	9:f53177f137e1c46b6a88c59ec1cb5218	renameColumn newColumnName=CREATED_ON, oldColumnName=LAST_SESSION_REFRESH, tableName=OFFLINE_USER_SESSION; addNotNullConstraint columnName=CREATED_ON, tableName=OFFLINE_USER_SESSION; addColumn tableName=OFFLINE_USER_SESSION; customChange; createIn...		\N	4.23.2	\N	\N	2741092203
4.8.0-KEYCLOAK-8835	sguilhen@redhat.com	META-INF/jpa-changelog-4.8.0.xml	2026-03-05 20:04:54.560089	70	EXECUTED	9:a74d33da4dc42a37ec27121580d1459f	addNotNullConstraint columnName=SSO_MAX_LIFESPAN_REMEMBER_ME, tableName=REALM; addNotNullConstraint columnName=SSO_IDLE_TIMEOUT_REMEMBER_ME, tableName=REALM		\N	4.23.2	\N	\N	2741092203
authz-7.0.0-KEYCLOAK-10443	psilva@redhat.com	META-INF/jpa-changelog-authz-7.0.0.xml	2026-03-05 20:04:54.565924	71	EXECUTED	9:fd4ade7b90c3b67fae0bfcfcb42dfb5f	addColumn tableName=RESOURCE_SERVER		\N	4.23.2	\N	\N	2741092203
8.0.0-adding-credential-columns	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-03-05 20:04:54.572481	72	EXECUTED	9:aa072ad090bbba210d8f18781b8cebf4	addColumn tableName=CREDENTIAL; addColumn tableName=FED_USER_CREDENTIAL		\N	4.23.2	\N	\N	2741092203
8.0.0-updating-credential-data-not-oracle-fixed	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-03-05 20:04:54.577768	73	EXECUTED	9:1ae6be29bab7c2aa376f6983b932be37	update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL		\N	4.23.2	\N	\N	2741092203
8.0.0-updating-credential-data-oracle-fixed	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-03-05 20:04:54.580246	74	MARK_RAN	9:14706f286953fc9a25286dbd8fb30d97	update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL		\N	4.23.2	\N	\N	2741092203
8.0.0-credential-cleanup-fixed	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-03-05 20:04:54.59831	75	EXECUTED	9:2b9cc12779be32c5b40e2e67711a218b	dropDefaultValue columnName=COUNTER, tableName=CREDENTIAL; dropDefaultValue columnName=DIGITS, tableName=CREDENTIAL; dropDefaultValue columnName=PERIOD, tableName=CREDENTIAL; dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; dropColumn ...		\N	4.23.2	\N	\N	2741092203
8.0.0-resource-tag-support	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-03-05 20:04:54.608393	76	EXECUTED	9:91fa186ce7a5af127a2d7a91ee083cc5	addColumn tableName=MIGRATION_MODEL; createIndex indexName=IDX_UPDATE_TIME, tableName=MIGRATION_MODEL		\N	4.23.2	\N	\N	2741092203
9.0.0-always-display-client	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-03-05 20:04:54.613435	77	EXECUTED	9:6335e5c94e83a2639ccd68dd24e2e5ad	addColumn tableName=CLIENT		\N	4.23.2	\N	\N	2741092203
9.0.0-drop-constraints-for-column-increase	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-03-05 20:04:54.615936	78	MARK_RAN	9:6bdb5658951e028bfe16fa0a8228b530	dropUniqueConstraint constraintName=UK_FRSR6T700S9V50BU18WS5PMT, tableName=RESOURCE_SERVER_PERM_TICKET; dropUniqueConstraint constraintName=UK_FRSR6T700S9V50BU18WS5HA6, tableName=RESOURCE_SERVER_RESOURCE; dropPrimaryKey constraintName=CONSTRAINT_O...		\N	4.23.2	\N	\N	2741092203
9.0.0-increase-column-size-federated-fk	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-03-05 20:04:54.638964	79	EXECUTED	9:d5bc15a64117ccad481ce8792d4c608f	modifyDataType columnName=CLIENT_ID, tableName=FED_USER_CONSENT; modifyDataType columnName=CLIENT_REALM_CONSTRAINT, tableName=KEYCLOAK_ROLE; modifyDataType columnName=OWNER, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=CLIENT_ID, ta...		\N	4.23.2	\N	\N	2741092203
9.0.0-recreate-constraints-after-column-increase	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-03-05 20:04:54.64268	80	MARK_RAN	9:077cba51999515f4d3e7ad5619ab592c	addNotNullConstraint columnName=CLIENT_ID, tableName=OFFLINE_CLIENT_SESSION; addNotNullConstraint columnName=OWNER, tableName=RESOURCE_SERVER_PERM_TICKET; addNotNullConstraint columnName=REQUESTER, tableName=RESOURCE_SERVER_PERM_TICKET; addNotNull...		\N	4.23.2	\N	\N	2741092203
9.0.1-add-index-to-client.client_id	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-03-05 20:04:54.651699	81	EXECUTED	9:be969f08a163bf47c6b9e9ead8ac2afb	createIndex indexName=IDX_CLIENT_ID, tableName=CLIENT		\N	4.23.2	\N	\N	2741092203
9.0.1-KEYCLOAK-12579-drop-constraints	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-03-05 20:04:54.654131	82	MARK_RAN	9:6d3bb4408ba5a72f39bd8a0b301ec6e3	dropUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	2741092203
9.0.1-KEYCLOAK-12579-add-not-null-constraint	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-03-05 20:04:54.659331	83	EXECUTED	9:966bda61e46bebf3cc39518fbed52fa7	addNotNullConstraint columnName=PARENT_GROUP, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	2741092203
9.0.1-KEYCLOAK-12579-recreate-constraints	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-03-05 20:04:54.661635	84	MARK_RAN	9:8dcac7bdf7378e7d823cdfddebf72fda	addUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	2741092203
9.0.1-add-index-to-events	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-03-05 20:04:54.670442	85	EXECUTED	9:7d93d602352a30c0c317e6a609b56599	createIndex indexName=IDX_EVENT_TIME, tableName=EVENT_ENTITY		\N	4.23.2	\N	\N	2741092203
map-remove-ri	keycloak	META-INF/jpa-changelog-11.0.0.xml	2026-03-05 20:04:54.678277	86	EXECUTED	9:71c5969e6cdd8d7b6f47cebc86d37627	dropForeignKeyConstraint baseTableName=REALM, constraintName=FK_TRAF444KK6QRKMS7N56AIWQ5Y; dropForeignKeyConstraint baseTableName=KEYCLOAK_ROLE, constraintName=FK_KJHO5LE2C0RAL09FL8CM9WFW9		\N	4.23.2	\N	\N	2741092203
map-remove-ri	keycloak	META-INF/jpa-changelog-12.0.0.xml	2026-03-05 20:04:54.687584	87	EXECUTED	9:a9ba7d47f065f041b7da856a81762021	dropForeignKeyConstraint baseTableName=REALM_DEFAULT_GROUPS, constraintName=FK_DEF_GROUPS_GROUP; dropForeignKeyConstraint baseTableName=REALM_DEFAULT_ROLES, constraintName=FK_H4WPD7W4HSOOLNI3H0SW7BTJE; dropForeignKeyConstraint baseTableName=CLIENT...		\N	4.23.2	\N	\N	2741092203
12.1.0-add-realm-localization-table	keycloak	META-INF/jpa-changelog-12.0.0.xml	2026-03-05 20:04:54.700906	88	EXECUTED	9:fffabce2bc01e1a8f5110d5278500065	createTable tableName=REALM_LOCALIZATIONS; addPrimaryKey tableName=REALM_LOCALIZATIONS		\N	4.23.2	\N	\N	2741092203
default-roles	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.706887	89	EXECUTED	9:fa8a5b5445e3857f4b010bafb5009957	addColumn tableName=REALM; customChange		\N	4.23.2	\N	\N	2741092203
default-roles-cleanup	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.714027	90	EXECUTED	9:67ac3241df9a8582d591c5ed87125f39	dropTable tableName=REALM_DEFAULT_ROLES; dropTable tableName=CLIENT_DEFAULT_ROLES		\N	4.23.2	\N	\N	2741092203
13.0.0-KEYCLOAK-16844	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.723035	91	EXECUTED	9:ad1194d66c937e3ffc82386c050ba089	createIndex indexName=IDX_OFFLINE_USS_PRELOAD, tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	2741092203
map-remove-ri-13.0.0	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.732507	92	EXECUTED	9:d9be619d94af5a2f5d07b9f003543b91	dropForeignKeyConstraint baseTableName=DEFAULT_CLIENT_SCOPE, constraintName=FK_R_DEF_CLI_SCOPE_SCOPE; dropForeignKeyConstraint baseTableName=CLIENT_SCOPE_CLIENT, constraintName=FK_C_CLI_SCOPE_SCOPE; dropForeignKeyConstraint baseTableName=CLIENT_SC...		\N	4.23.2	\N	\N	2741092203
13.0.0-KEYCLOAK-17992-drop-constraints	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.734785	93	MARK_RAN	9:544d201116a0fcc5a5da0925fbbc3bde	dropPrimaryKey constraintName=C_CLI_SCOPE_BIND, tableName=CLIENT_SCOPE_CLIENT; dropIndex indexName=IDX_CLSCOPE_CL, tableName=CLIENT_SCOPE_CLIENT; dropIndex indexName=IDX_CL_CLSCOPE, tableName=CLIENT_SCOPE_CLIENT		\N	4.23.2	\N	\N	2741092203
13.0.0-increase-column-size-federated	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.746465	94	EXECUTED	9:43c0c1055b6761b4b3e89de76d612ccf	modifyDataType columnName=CLIENT_ID, tableName=CLIENT_SCOPE_CLIENT; modifyDataType columnName=SCOPE_ID, tableName=CLIENT_SCOPE_CLIENT		\N	4.23.2	\N	\N	2741092203
13.0.0-KEYCLOAK-17992-recreate-constraints	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.749566	95	MARK_RAN	9:8bd711fd0330f4fe980494ca43ab1139	addNotNullConstraint columnName=CLIENT_ID, tableName=CLIENT_SCOPE_CLIENT; addNotNullConstraint columnName=SCOPE_ID, tableName=CLIENT_SCOPE_CLIENT; addPrimaryKey constraintName=C_CLI_SCOPE_BIND, tableName=CLIENT_SCOPE_CLIENT; createIndex indexName=...		\N	4.23.2	\N	\N	2741092203
json-string-accomodation-fixed	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-03-05 20:04:54.755983	96	EXECUTED	9:e07d2bc0970c348bb06fb63b1f82ddbf	addColumn tableName=REALM_ATTRIBUTE; update tableName=REALM_ATTRIBUTE; dropColumn columnName=VALUE, tableName=REALM_ATTRIBUTE; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=REALM_ATTRIBUTE		\N	4.23.2	\N	\N	2741092203
14.0.0-KEYCLOAK-11019	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.773232	97	EXECUTED	9:24fb8611e97f29989bea412aa38d12b7	createIndex indexName=IDX_OFFLINE_CSS_PRELOAD, tableName=OFFLINE_CLIENT_SESSION; createIndex indexName=IDX_OFFLINE_USS_BY_USER, tableName=OFFLINE_USER_SESSION; createIndex indexName=IDX_OFFLINE_USS_BY_USERSESS, tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	2741092203
14.0.0-KEYCLOAK-18286	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.775617	98	MARK_RAN	9:259f89014ce2506ee84740cbf7163aa7	createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	2741092203
14.0.0-KEYCLOAK-18286-revert	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.785181	99	MARK_RAN	9:04baaf56c116ed19951cbc2cca584022	dropIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	2741092203
14.0.0-KEYCLOAK-18286-supported-dbs	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.794229	100	EXECUTED	9:60ca84a0f8c94ec8c3504a5a3bc88ee8	createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	2741092203
14.0.0-KEYCLOAK-18286-unsupported-dbs	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.796562	101	MARK_RAN	9:d3d977031d431db16e2c181ce49d73e9	createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	2741092203
KEYCLOAK-17267-add-index-to-user-attributes	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.804983	102	EXECUTED	9:0b305d8d1277f3a89a0a53a659ad274c	createIndex indexName=IDX_USER_ATTRIBUTE_NAME, tableName=USER_ATTRIBUTE		\N	4.23.2	\N	\N	2741092203
KEYCLOAK-18146-add-saml-art-binding-identifier	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-03-05 20:04:54.808692	103	EXECUTED	9:2c374ad2cdfe20e2905a84c8fac48460	customChange		\N	4.23.2	\N	\N	2741092203
15.0.0-KEYCLOAK-18467	keycloak	META-INF/jpa-changelog-15.0.0.xml	2026-03-05 20:04:54.815824	104	EXECUTED	9:47a760639ac597360a8219f5b768b4de	addColumn tableName=REALM_LOCALIZATIONS; update tableName=REALM_LOCALIZATIONS; dropColumn columnName=TEXTS, tableName=REALM_LOCALIZATIONS; renameColumn newColumnName=TEXTS, oldColumnName=TEXTS_NEW, tableName=REALM_LOCALIZATIONS; addNotNullConstrai...		\N	4.23.2	\N	\N	2741092203
17.0.0-9562	keycloak	META-INF/jpa-changelog-17.0.0.xml	2026-03-05 20:04:54.82811	105	EXECUTED	9:a6272f0576727dd8cad2522335f5d99e	createIndex indexName=IDX_USER_SERVICE_ACCOUNT, tableName=USER_ENTITY		\N	4.23.2	\N	\N	2741092203
18.0.0-10625-IDX_ADMIN_EVENT_TIME	keycloak	META-INF/jpa-changelog-18.0.0.xml	2026-03-05 20:04:54.837578	106	EXECUTED	9:015479dbd691d9cc8669282f4828c41d	createIndex indexName=IDX_ADMIN_EVENT_TIME, tableName=ADMIN_EVENT_ENTITY		\N	4.23.2	\N	\N	2741092203
19.0.0-10135	keycloak	META-INF/jpa-changelog-19.0.0.xml	2026-03-05 20:04:54.841671	107	EXECUTED	9:9518e495fdd22f78ad6425cc30630221	customChange		\N	4.23.2	\N	\N	2741092203
20.0.0-12964-supported-dbs	keycloak	META-INF/jpa-changelog-20.0.0.xml	2026-03-05 20:04:54.850882	108	EXECUTED	9:e5f243877199fd96bcc842f27a1656ac	createIndex indexName=IDX_GROUP_ATT_BY_NAME_VALUE, tableName=GROUP_ATTRIBUTE		\N	4.23.2	\N	\N	2741092203
20.0.0-12964-unsupported-dbs	keycloak	META-INF/jpa-changelog-20.0.0.xml	2026-03-05 20:04:54.853027	109	MARK_RAN	9:1a6fcaa85e20bdeae0a9ce49b41946a5	createIndex indexName=IDX_GROUP_ATT_BY_NAME_VALUE, tableName=GROUP_ATTRIBUTE		\N	4.23.2	\N	\N	2741092203
client-attributes-string-accomodation-fixed	keycloak	META-INF/jpa-changelog-20.0.0.xml	2026-03-05 20:04:54.859473	110	EXECUTED	9:3f332e13e90739ed0c35b0b25b7822ca	addColumn tableName=CLIENT_ATTRIBUTES; update tableName=CLIENT_ATTRIBUTES; dropColumn columnName=VALUE, tableName=CLIENT_ATTRIBUTES; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	2741092203
21.0.2-17277	keycloak	META-INF/jpa-changelog-21.0.2.xml	2026-03-05 20:04:54.863143	111	EXECUTED	9:7ee1f7a3fb8f5588f171fb9a6ab623c0	customChange		\N	4.23.2	\N	\N	2741092203
21.1.0-19404	keycloak	META-INF/jpa-changelog-21.1.0.xml	2026-03-05 20:04:54.90708	112	EXECUTED	9:3d7e830b52f33676b9d64f7f2b2ea634	modifyDataType columnName=DECISION_STRATEGY, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=LOGIC, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=POLICY_ENFORCE_MODE, tableName=RESOURCE_SERVER		\N	4.23.2	\N	\N	2741092203
21.1.0-19404-2	keycloak	META-INF/jpa-changelog-21.1.0.xml	2026-03-05 20:04:54.910434	113	MARK_RAN	9:627d032e3ef2c06c0e1f73d2ae25c26c	addColumn tableName=RESOURCE_SERVER_POLICY; update tableName=RESOURCE_SERVER_POLICY; dropColumn columnName=DECISION_STRATEGY, tableName=RESOURCE_SERVER_POLICY; renameColumn newColumnName=DECISION_STRATEGY, oldColumnName=DECISION_STRATEGY_NEW, tabl...		\N	4.23.2	\N	\N	2741092203
22.0.0-17484-updated	keycloak	META-INF/jpa-changelog-22.0.0.xml	2026-03-05 20:04:54.915046	114	EXECUTED	9:90af0bfd30cafc17b9f4d6eccd92b8b3	customChange		\N	4.23.2	\N	\N	2741092203
22.0.5-24031	keycloak	META-INF/jpa-changelog-22.0.0.xml	2026-03-05 20:04:54.917581	115	MARK_RAN	9:a60d2d7b315ec2d3eba9e2f145f9df28	customChange		\N	4.23.2	\N	\N	2741092203
23.0.0-12062	keycloak	META-INF/jpa-changelog-23.0.0.xml	2026-03-05 20:04:54.924122	116	EXECUTED	9:2168fbe728fec46ae9baf15bf80927b8	addColumn tableName=COMPONENT_CONFIG; update tableName=COMPONENT_CONFIG; dropColumn columnName=VALUE, tableName=COMPONENT_CONFIG; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=COMPONENT_CONFIG		\N	4.23.2	\N	\N	2741092203
23.0.0-17258	keycloak	META-INF/jpa-changelog-23.0.0.xml	2026-03-05 20:04:54.92874	117	EXECUTED	9:36506d679a83bbfda85a27ea1864dca8	addColumn tableName=EVENT_ENTITY		\N	4.23.2	\N	\N	2741092203
\.


--
-- Data for Name: databasechangeloglock; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.databasechangeloglock (id, locked, lockgranted, lockedby) FROM stdin;
1	f	\N	\N
1000	f	\N	\N
1001	f	\N	\N
\.


--
-- Data for Name: default_client_scope; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.default_client_scope (realm_id, scope_id, default_scope) FROM stdin;
81ce423f-6d27-457d-908e-6ad3e5d50ea2	9faad29a-419b-447a-bf8c-5240cb84224f	f
81ce423f-6d27-457d-908e-6ad3e5d50ea2	f3940cf4-8856-40b2-82d8-a4c0c045fcb4	t
81ce423f-6d27-457d-908e-6ad3e5d50ea2	0e0bce7c-3b57-4254-b6db-881c44445462	t
81ce423f-6d27-457d-908e-6ad3e5d50ea2	e9d50e83-c6ee-4b97-9271-b578286aa81e	t
81ce423f-6d27-457d-908e-6ad3e5d50ea2	fd0968cc-c08e-407d-ae7d-2df7a62f112c	f
81ce423f-6d27-457d-908e-6ad3e5d50ea2	6b8f416c-3650-4305-8283-7b4b3bd60aff	f
81ce423f-6d27-457d-908e-6ad3e5d50ea2	95723787-cf89-4a71-af07-3f6b17e1706e	t
81ce423f-6d27-457d-908e-6ad3e5d50ea2	46990251-659e-4142-bcd8-3f6ea745bdfd	t
81ce423f-6d27-457d-908e-6ad3e5d50ea2	5b157794-4036-44f0-a2a1-1ba133ea87c8	f
81ce423f-6d27-457d-908e-6ad3e5d50ea2	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa	t
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	8f6bd15c-b8c8-4d06-bfa8-e0bd9c0344d3	f
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	f6bbbe2e-7a55-417b-b1c8-c42d4a89b1a4	t
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c6204bb2-b524-49a1-a713-e2959bbbd316	t
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	6ab6c4e1-e734-4c50-8743-da14f08eaed3	t
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	670b1813-236c-4e62-a2e5-e1655e2e67b4	f
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	da7a43fb-2d6c-4426-9b53-25cf20fe71ea	f
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	1ff68379-2fde-42b8-ad84-64a8580f117b	t
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	3df9962d-ee71-4b2a-ba69-e287eb719a3f	t
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	4e1dde19-0bf0-4875-8134-7766d61fc54b	f
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	bfc118e0-dd79-4559-bf33-a6363c98b72a	t
\.


--
-- Data for Name: event_entity; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.event_entity (id, client_id, details_json, error, ip_address, realm_id, session_id, event_time, type, user_id, details_json_long_value) FROM stdin;
\.


--
-- Data for Name: fed_user_attribute; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_attribute (id, name, user_id, realm_id, storage_provider_id, value) FROM stdin;
\.


--
-- Data for Name: fed_user_consent; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_consent (id, client_id, user_id, realm_id, storage_provider_id, created_date, last_updated_date, client_storage_provider, external_client_id) FROM stdin;
\.


--
-- Data for Name: fed_user_consent_cl_scope; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_consent_cl_scope (user_consent_id, scope_id) FROM stdin;
\.


--
-- Data for Name: fed_user_credential; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_credential (id, salt, type, created_date, user_id, realm_id, storage_provider_id, user_label, secret_data, credential_data, priority) FROM stdin;
\.


--
-- Data for Name: fed_user_group_membership; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_group_membership (group_id, user_id, realm_id, storage_provider_id) FROM stdin;
\.


--
-- Data for Name: fed_user_required_action; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_required_action (required_action, user_id, realm_id, storage_provider_id) FROM stdin;
\.


--
-- Data for Name: fed_user_role_mapping; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.fed_user_role_mapping (role_id, user_id, realm_id, storage_provider_id) FROM stdin;
\.


--
-- Data for Name: federated_identity; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.federated_identity (identity_provider, realm_id, federated_user_id, federated_username, token, user_id) FROM stdin;
\.


--
-- Data for Name: federated_user; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.federated_user (id, storage_provider_id, realm_id) FROM stdin;
\.


--
-- Data for Name: group_attribute; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.group_attribute (id, name, value, group_id) FROM stdin;
\.


--
-- Data for Name: group_role_mapping; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.group_role_mapping (role_id, group_id) FROM stdin;
\.


--
-- Data for Name: identity_provider; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.identity_provider (internal_id, enabled, provider_alias, provider_id, store_token, authenticate_by_default, realm_id, add_token_role, trust_email, first_broker_login_flow_id, post_broker_login_flow_id, provider_display_name, link_only) FROM stdin;
\.


--
-- Data for Name: identity_provider_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.identity_provider_config (identity_provider_id, value, name) FROM stdin;
\.


--
-- Data for Name: identity_provider_mapper; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.identity_provider_mapper (id, name, idp_alias, idp_mapper_name, realm_id) FROM stdin;
\.


--
-- Data for Name: idp_mapper_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.idp_mapper_config (idp_mapper_id, value, name) FROM stdin;
\.


--
-- Data for Name: keycloak_group; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.keycloak_group (id, name, parent_group, realm_id) FROM stdin;
\.


--
-- Data for Name: keycloak_role; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.keycloak_role (id, client_realm_constraint, client_role, description, name, realm_id, client, realm) FROM stdin;
12cc11c1-22aa-4e02-b889-c351e7c8007c	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	${role_default-roles}	default-roles-master	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	\N
5bb963b1-9657-42c9-8954-2c3a31a07699	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	${role_admin}	admin	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	\N
c84276d9-1372-430d-9a38-a23bc246b80a	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	${role_create-realm}	create-realm	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	\N
fee7e6b5-07c8-45bd-a74c-04d5ca951d0a	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_create-client}	create-client	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
a5e7fa01-ddb3-461c-8134-4cc9c3212736	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_view-realm}	view-realm	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
b8bf591e-a2e4-4b89-82ed-0c2c20574e24	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_view-users}	view-users	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
cdce217e-1d38-4359-b5f2-2f2ddc16c82f	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_view-clients}	view-clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
0c72d429-b10c-4396-932b-da070fda64dc	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_view-events}	view-events	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
f57196b8-cd57-4ddc-b75f-09193e6b1d57	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_view-identity-providers}	view-identity-providers	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
3d787066-6249-44c2-9b3f-40518202175e	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_view-authorization}	view-authorization	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
4d00372e-7b6e-4b11-975d-f8a6a7a1ecde	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_manage-realm}	manage-realm	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
3271c065-71f1-4e79-b5f4-e87056d25047	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_manage-users}	manage-users	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
82cf2f12-75bb-4ea3-b03d-094f97c11ef8	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_manage-clients}	manage-clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
a08841f0-400b-4fe5-8b01-a8419ae2884f	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_manage-events}	manage-events	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
fe96cd62-c739-4065-8058-9b0eeb5e384d	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_manage-identity-providers}	manage-identity-providers	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
c8463c15-3931-4f9c-b212-c9ea4860fba8	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_manage-authorization}	manage-authorization	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
1b61aeae-9b44-41a5-b696-507331bd0905	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_query-users}	query-users	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
e8c05328-c89a-478f-b3e8-75abd8d9d988	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_query-clients}	query-clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
13b6821d-ba62-4cce-a784-cd5ad947ae9b	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_query-realms}	query-realms	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
d2b1e53e-5ed2-4e8c-89f9-cd66a05ab943	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_query-groups}	query-groups	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
e2c70bee-ea70-44eb-8cf2-5d9488a3667a	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_view-profile}	view-profile	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
b4aeb7d2-4691-4e28-b713-b8e2514644b3	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_manage-account}	manage-account	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
b81a5197-7dba-4638-9532-3bdfefd2037c	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_manage-account-links}	manage-account-links	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
4eede9c3-3138-45d9-8eb5-23a346d2f1e5	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_view-applications}	view-applications	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
f89f5b6c-d449-4afe-85bd-3ea2bbd291f4	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_view-consent}	view-consent	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
d6f07163-1f8a-41cb-8ec2-f85cbc6108ce	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_manage-consent}	manage-consent	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
12736e09-f666-41fd-a9a4-29cfe207f0f0	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_view-groups}	view-groups	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
5a0055b7-0c7d-4405-b98f-27b63124e484	289cc572-5dd8-4eef-ad7c-cdf72368d79f	t	${role_delete-account}	delete-account	81ce423f-6d27-457d-908e-6ad3e5d50ea2	289cc572-5dd8-4eef-ad7c-cdf72368d79f	\N
735900b8-fffd-4df0-ac75-c9186c41847e	de6bc198-3c35-4bb5-860c-ea6cfa8037e4	t	${role_read-token}	read-token	81ce423f-6d27-457d-908e-6ad3e5d50ea2	de6bc198-3c35-4bb5-860c-ea6cfa8037e4	\N
fdc0fdc6-8208-4041-8bda-7455effdf12f	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	t	${role_impersonation}	impersonation	81ce423f-6d27-457d-908e-6ad3e5d50ea2	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	\N
f6839928-9f95-4356-914c-16d7fc3c0dc9	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	${role_offline-access}	offline_access	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	\N
a4b940d3-ee2b-4a8a-bb9b-04ef95060c0a	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	${role_uma_authorization}	uma_authorization	81ce423f-6d27-457d-908e-6ad3e5d50ea2	\N	\N
158ee450-2830-4a46-ad19-6ebacc1712f5	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	f	${role_default-roles}	default-roles-projecthub	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N	\N
ec22bf26-7b0b-4cce-8a9d-221fec39f0fb	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_create-client}	create-client	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
a505c6e5-e02b-4209-a47f-155031d25ebd	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_view-realm}	view-realm	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
6eaca463-b3b9-48b2-8986-f6931a5071fc	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_view-users}	view-users	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
5f706167-bddc-4406-8bf4-7c44739625ec	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_view-clients}	view-clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
19b9371d-788d-42ab-9bdc-b4173c992c87	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_view-events}	view-events	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
70232603-0058-45bf-8673-6c742f11a07d	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_view-identity-providers}	view-identity-providers	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
7a7a8911-069d-4c75-9cb7-2777b0e543a4	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_view-authorization}	view-authorization	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
de53c114-428f-442a-9235-e3359f156e95	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_manage-realm}	manage-realm	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
80634488-0368-4d9f-8dce-2b37ad958447	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_manage-users}	manage-users	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
ca44eb80-79aa-4b2f-88de-5ea37c64dbce	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_manage-clients}	manage-clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
1f0ef04e-3cd9-4a53-9642-f47ae0da0bec	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_manage-events}	manage-events	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
754584d3-3ce4-44bb-b9d6-8003e4a76df1	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_manage-identity-providers}	manage-identity-providers	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
436b59c6-aae6-42f2-8b8c-940627a8b24c	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_manage-authorization}	manage-authorization	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
5da57500-29f1-43b0-9fe5-52ed147149c7	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_query-users}	query-users	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
636e94d4-3d41-47de-b3e6-c9e90158b020	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_query-clients}	query-clients	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
0fd8c972-e225-4a7a-a63e-1d5b64afb09e	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_query-realms}	query-realms	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
bb2a5d0e-a8c2-4d15-9f44-e362204733d8	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_query-groups}	query-groups	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
f8bb4972-92cc-4709-bdf9-bfb7e3c3afbb	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_realm-admin}	realm-admin	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
76893a2d-e27c-459c-a2be-a8d2a416c972	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_create-client}	create-client	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
e5698b4c-1269-469c-ba30-51c6fa0ac1ed	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_view-realm}	view-realm	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
7abe989b-59a7-4eb2-9c86-b3c6d73a4f43	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_view-users}	view-users	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
c7332b67-a988-465b-bbbe-8c2dc2566536	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_view-clients}	view-clients	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
3d43ccd9-4f27-4d75-93c7-56e31d27af52	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_view-events}	view-events	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
9baa2167-1c12-4eba-94c6-a355e2ebd4d5	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_view-identity-providers}	view-identity-providers	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
c4344af9-b777-4d2c-a64a-d88f7347387a	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_view-authorization}	view-authorization	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
6d4c00d8-e43b-4fe9-b756-8efd42a2c07a	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_manage-realm}	manage-realm	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
a2e76a8a-ffba-4f0b-8dc0-1fd1969d03d6	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_manage-users}	manage-users	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
f334cb4c-e95e-473d-aeea-df441a839ae1	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_manage-clients}	manage-clients	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
a4971718-a4c2-4776-8503-9e5d535b05dc	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_manage-events}	manage-events	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
52ac97b0-f96c-4f11-9d21-f14b7ad4587d	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_manage-identity-providers}	manage-identity-providers	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
4c458fe4-d479-4b1a-a455-d59e58a19675	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_manage-authorization}	manage-authorization	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
b62eae55-7e93-4f4b-b59b-027b4f066fe1	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_query-users}	query-users	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
235012e1-7b4b-4bd1-8ca5-4de887322569	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_query-clients}	query-clients	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
334505a3-e3d9-4fc5-aa68-0ba9e7250447	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_query-realms}	query-realms	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
2420d973-a2a0-41fe-aae6-2a9112ef98e0	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_query-groups}	query-groups	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
0c216cbd-a80d-4e0f-b7f0-93be1e3cd134	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_view-profile}	view-profile	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
22828d60-b96e-400c-b666-290f0114b2a2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_manage-account}	manage-account	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
12161bc9-8f8d-4f04-b4e1-99854b1a2206	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_manage-account-links}	manage-account-links	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
b579b28a-2d86-4757-a62f-55c01c428068	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_view-applications}	view-applications	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
c9a49995-ecf0-4e11-a879-1541cfb41c8b	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_view-consent}	view-consent	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
3cb1fd0c-b1b9-49a9-9125-84e41e82df78	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_manage-consent}	manage-consent	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
29d5cad4-ac12-4ee3-840b-7aaa3c1f7d69	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_view-groups}	view-groups	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
199ca7ae-88d9-4c3f-8c04-d09b6f579887	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	t	${role_delete-account}	delete-account	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	\N
a17a3ae8-eeae-44e2-a8f4-4165b273e30d	d97ba5d6-d1e5-4ac9-8e70-852394afb542	t	${role_impersonation}	impersonation	81ce423f-6d27-457d-908e-6ad3e5d50ea2	d97ba5d6-d1e5-4ac9-8e70-852394afb542	\N
d202bf79-6248-445b-88d3-dea849ab2e03	515acdae-2d03-413b-ab7c-8746fbe441d6	t	${role_impersonation}	impersonation	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	515acdae-2d03-413b-ab7c-8746fbe441d6	\N
1221d87a-bd90-4518-8a0d-216095bfe732	55d16125-13f3-4107-8d49-88bd01aee599	t	${role_read-token}	read-token	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	55d16125-13f3-4107-8d49-88bd01aee599	\N
a7377c7e-a2d6-4cc2-844b-ddbb4e1904cb	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	f	${role_offline-access}	offline_access	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N	\N
e9e911b6-d223-43a3-bdc7-603f1427f4cb	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	f	${role_uma_authorization}	uma_authorization	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	\N	\N
\.


--
-- Data for Name: migration_model; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.migration_model (id, version, update_time) FROM stdin;
30abu	23.0.7	1772741095
\.


--
-- Data for Name: offline_client_session; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.offline_client_session (user_session_id, client_id, offline_flag, "timestamp", data, client_storage_provider, external_client_id) FROM stdin;
\.


--
-- Data for Name: offline_user_session; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.offline_user_session (user_session_id, user_id, realm_id, created_on, offline_flag, data, last_session_refresh) FROM stdin;
\.


--
-- Data for Name: policy_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.policy_config (policy_id, name, value) FROM stdin;
\.


--
-- Data for Name: protocol_mapper; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.protocol_mapper (id, name, protocol, protocol_mapper_name, client_id, client_scope_id) FROM stdin;
c5f84b14-3fda-4cd5-bed0-4f8debbb6abf	audience resolve	openid-connect	oidc-audience-resolve-mapper	f92a3457-b0d6-46eb-94c7-73e800c4bec0	\N
70959719-2eaa-46f2-b521-d2d30e821e4e	locale	openid-connect	oidc-usermodel-attribute-mapper	5ed82a86-ee2d-4a26-9cfe-96894d665876	\N
789f13f5-b1bd-4d52-83a9-e7fe4957b7c4	role list	saml	saml-role-list-mapper	\N	f3940cf4-8856-40b2-82d8-a4c0c045fcb4
5e9d8f98-64b5-4f9e-8a64-84f863551eda	full name	openid-connect	oidc-full-name-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
1644e802-42a8-4ec8-acdd-6548854db15f	family name	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
60b985aa-eb5a-46e3-9859-ceecea65b592	given name	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
7a6489f1-ecf1-4769-a09c-28f370a3ca90	middle name	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
91c803da-a789-47fa-9c01-eee6ac9551a6	nickname	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
9356e133-c118-4436-9fd9-f2499485ab9c	username	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
49589373-3151-4d23-a72d-09f4372db5a2	profile	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
06b92669-68fe-4716-9d4f-3da613034fed	picture	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
a5b10706-7730-4e4d-80f4-32b9e974c7b3	website	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
26ef1e5e-68da-4987-949c-79fb7de51cb2	gender	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
f60cad2e-f41f-40dd-b643-1fb32502fb6f	birthdate	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
08a871c4-9c80-445d-93cc-c2b82f873064	zoneinfo	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
c55368a7-9f84-49e2-93cb-e47e37e53a03	locale	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
1b1cb250-981d-48cc-8d66-9d1375193a37	updated at	openid-connect	oidc-usermodel-attribute-mapper	\N	0e0bce7c-3b57-4254-b6db-881c44445462
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	email	openid-connect	oidc-usermodel-attribute-mapper	\N	e9d50e83-c6ee-4b97-9271-b578286aa81e
5ba3c479-3cc8-4689-92b3-1754caff496f	email verified	openid-connect	oidc-usermodel-property-mapper	\N	e9d50e83-c6ee-4b97-9271-b578286aa81e
224c16f7-3553-4d97-82fc-e347c39ef856	address	openid-connect	oidc-address-mapper	\N	fd0968cc-c08e-407d-ae7d-2df7a62f112c
61e3f19c-6e39-4922-a219-edaa4ee51079	phone number	openid-connect	oidc-usermodel-attribute-mapper	\N	6b8f416c-3650-4305-8283-7b4b3bd60aff
fbcde5eb-363c-4c16-8708-731d79c92699	phone number verified	openid-connect	oidc-usermodel-attribute-mapper	\N	6b8f416c-3650-4305-8283-7b4b3bd60aff
6ba21fc8-00ef-4b50-bce0-af0f09e20672	realm roles	openid-connect	oidc-usermodel-realm-role-mapper	\N	95723787-cf89-4a71-af07-3f6b17e1706e
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	client roles	openid-connect	oidc-usermodel-client-role-mapper	\N	95723787-cf89-4a71-af07-3f6b17e1706e
0b46a057-bd58-44c6-bfc5-0196b33a1ba8	audience resolve	openid-connect	oidc-audience-resolve-mapper	\N	95723787-cf89-4a71-af07-3f6b17e1706e
a2d3e5e8-ae83-41ca-84ea-ea014d0e758d	allowed web origins	openid-connect	oidc-allowed-origins-mapper	\N	46990251-659e-4142-bcd8-3f6ea745bdfd
e9fe3c37-ce58-4693-8249-7a67611e80b9	upn	openid-connect	oidc-usermodel-attribute-mapper	\N	5b157794-4036-44f0-a2a1-1ba133ea87c8
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	groups	openid-connect	oidc-usermodel-realm-role-mapper	\N	5b157794-4036-44f0-a2a1-1ba133ea87c8
b4b203a2-3b83-4364-addd-b2c359823527	acr loa level	openid-connect	oidc-acr-mapper	\N	d5a1c804-27bf-4173-a4b9-75e0ebcb2bfa
96d708a2-7de6-442b-bb46-eedc5c6dc394	audience resolve	openid-connect	oidc-audience-resolve-mapper	d0d3e753-09cf-4095-bbaf-2d1c4888a07f	\N
193079b1-cb77-42cf-9e09-84f6ca9bad24	role list	saml	saml-role-list-mapper	\N	f6bbbe2e-7a55-417b-b1c8-c42d4a89b1a4
d4b5b1a3-8f5b-4b89-a859-bbb676a4f6c4	full name	openid-connect	oidc-full-name-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
4a0538c9-9a03-4319-b583-01e5a249c284	family name	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	given name	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
b5b4ce34-983d-4571-940a-997751002b47	middle name	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
2f63702e-fd13-450b-a8f1-6741ac65aac2	nickname	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
426323ab-034e-4175-8412-4e606a8c3d09	username	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
2f6ace20-b147-4320-b573-c586f558b204	profile	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
c601d371-25b3-48af-ac73-fea300ad70f6	picture	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
c3e76a75-fdb5-46af-beb3-c953119198ed	website	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
8efa74fd-11a4-4f82-8088-e173bdefa40e	gender	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	birthdate	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
d66c1701-7231-4fe7-8190-7ffe649b7873	zoneinfo	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
7f193841-15f6-44ef-84e2-eee66272a866	locale	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
cd690425-78c1-4c25-a040-1e6d764e6905	updated at	openid-connect	oidc-usermodel-attribute-mapper	\N	c6204bb2-b524-49a1-a713-e2959bbbd316
67d7eb6f-11c3-48d5-9cde-5a679345ba46	email	openid-connect	oidc-usermodel-attribute-mapper	\N	6ab6c4e1-e734-4c50-8743-da14f08eaed3
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	email verified	openid-connect	oidc-usermodel-property-mapper	\N	6ab6c4e1-e734-4c50-8743-da14f08eaed3
a26aa0aa-0d37-4df9-bfbf-6335d2361669	address	openid-connect	oidc-address-mapper	\N	670b1813-236c-4e62-a2e5-e1655e2e67b4
fc94e237-92fd-468f-a010-e2a7b0444222	phone number	openid-connect	oidc-usermodel-attribute-mapper	\N	da7a43fb-2d6c-4426-9b53-25cf20fe71ea
9a1bde82-2ab3-49de-9e78-86261be9b151	phone number verified	openid-connect	oidc-usermodel-attribute-mapper	\N	da7a43fb-2d6c-4426-9b53-25cf20fe71ea
cd415720-db22-4cb3-a359-5ecff0828908	realm roles	openid-connect	oidc-usermodel-realm-role-mapper	\N	1ff68379-2fde-42b8-ad84-64a8580f117b
6e3c31c3-d078-45ab-948b-02f88e384a8d	client roles	openid-connect	oidc-usermodel-client-role-mapper	\N	1ff68379-2fde-42b8-ad84-64a8580f117b
b53a7ff0-fefc-4546-aa21-8641750a3c80	audience resolve	openid-connect	oidc-audience-resolve-mapper	\N	1ff68379-2fde-42b8-ad84-64a8580f117b
11967989-f9ea-4dd2-87f0-89de3722b6f6	allowed web origins	openid-connect	oidc-allowed-origins-mapper	\N	3df9962d-ee71-4b2a-ba69-e287eb719a3f
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	upn	openid-connect	oidc-usermodel-attribute-mapper	\N	4e1dde19-0bf0-4875-8134-7766d61fc54b
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	groups	openid-connect	oidc-usermodel-realm-role-mapper	\N	4e1dde19-0bf0-4875-8134-7766d61fc54b
86737549-673a-44d2-8736-76b35e4511c9	acr loa level	openid-connect	oidc-acr-mapper	\N	bfc118e0-dd79-4559-bf33-a6363c98b72a
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	locale	openid-connect	oidc-usermodel-attribute-mapper	adfad328-7317-45a3-a350-ac722c036de9	\N
3781216b-f385-4b9e-b7ff-f30f628a1040	Client ID	openid-connect	oidc-usersessionmodel-note-mapper	0ddc2e3b-80ec-4439-a912-9bfbff102504	\N
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	Client Host	openid-connect	oidc-usersessionmodel-note-mapper	0ddc2e3b-80ec-4439-a912-9bfbff102504	\N
0f71712b-338c-49c2-a092-e0e072692de7	Client IP Address	openid-connect	oidc-usersessionmodel-note-mapper	0ddc2e3b-80ec-4439-a912-9bfbff102504	\N
41d29ac8-8116-44c4-9e70-65e42b993e1a	aud	openid-connect	oidc-audience-mapper	e29200a5-a570-4ff9-89aa-1383abbff2ca	\N
\.


--
-- Data for Name: protocol_mapper_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.protocol_mapper_config (protocol_mapper_id, value, name) FROM stdin;
70959719-2eaa-46f2-b521-d2d30e821e4e	true	introspection.token.claim
70959719-2eaa-46f2-b521-d2d30e821e4e	true	userinfo.token.claim
70959719-2eaa-46f2-b521-d2d30e821e4e	locale	user.attribute
70959719-2eaa-46f2-b521-d2d30e821e4e	true	id.token.claim
70959719-2eaa-46f2-b521-d2d30e821e4e	true	access.token.claim
70959719-2eaa-46f2-b521-d2d30e821e4e	locale	claim.name
70959719-2eaa-46f2-b521-d2d30e821e4e	String	jsonType.label
789f13f5-b1bd-4d52-83a9-e7fe4957b7c4	false	single
789f13f5-b1bd-4d52-83a9-e7fe4957b7c4	Basic	attribute.nameformat
789f13f5-b1bd-4d52-83a9-e7fe4957b7c4	Role	attribute.name
06b92669-68fe-4716-9d4f-3da613034fed	true	introspection.token.claim
06b92669-68fe-4716-9d4f-3da613034fed	true	userinfo.token.claim
06b92669-68fe-4716-9d4f-3da613034fed	picture	user.attribute
06b92669-68fe-4716-9d4f-3da613034fed	true	id.token.claim
06b92669-68fe-4716-9d4f-3da613034fed	true	access.token.claim
06b92669-68fe-4716-9d4f-3da613034fed	picture	claim.name
06b92669-68fe-4716-9d4f-3da613034fed	String	jsonType.label
08a871c4-9c80-445d-93cc-c2b82f873064	true	introspection.token.claim
08a871c4-9c80-445d-93cc-c2b82f873064	true	userinfo.token.claim
08a871c4-9c80-445d-93cc-c2b82f873064	zoneinfo	user.attribute
08a871c4-9c80-445d-93cc-c2b82f873064	true	id.token.claim
08a871c4-9c80-445d-93cc-c2b82f873064	true	access.token.claim
08a871c4-9c80-445d-93cc-c2b82f873064	zoneinfo	claim.name
08a871c4-9c80-445d-93cc-c2b82f873064	String	jsonType.label
1644e802-42a8-4ec8-acdd-6548854db15f	true	introspection.token.claim
1644e802-42a8-4ec8-acdd-6548854db15f	true	userinfo.token.claim
1644e802-42a8-4ec8-acdd-6548854db15f	lastName	user.attribute
1644e802-42a8-4ec8-acdd-6548854db15f	true	id.token.claim
1644e802-42a8-4ec8-acdd-6548854db15f	true	access.token.claim
1644e802-42a8-4ec8-acdd-6548854db15f	family_name	claim.name
1644e802-42a8-4ec8-acdd-6548854db15f	String	jsonType.label
1b1cb250-981d-48cc-8d66-9d1375193a37	true	introspection.token.claim
1b1cb250-981d-48cc-8d66-9d1375193a37	true	userinfo.token.claim
1b1cb250-981d-48cc-8d66-9d1375193a37	updatedAt	user.attribute
1b1cb250-981d-48cc-8d66-9d1375193a37	true	id.token.claim
1b1cb250-981d-48cc-8d66-9d1375193a37	true	access.token.claim
1b1cb250-981d-48cc-8d66-9d1375193a37	updated_at	claim.name
1b1cb250-981d-48cc-8d66-9d1375193a37	long	jsonType.label
26ef1e5e-68da-4987-949c-79fb7de51cb2	true	introspection.token.claim
26ef1e5e-68da-4987-949c-79fb7de51cb2	true	userinfo.token.claim
26ef1e5e-68da-4987-949c-79fb7de51cb2	gender	user.attribute
26ef1e5e-68da-4987-949c-79fb7de51cb2	true	id.token.claim
26ef1e5e-68da-4987-949c-79fb7de51cb2	true	access.token.claim
26ef1e5e-68da-4987-949c-79fb7de51cb2	gender	claim.name
26ef1e5e-68da-4987-949c-79fb7de51cb2	String	jsonType.label
49589373-3151-4d23-a72d-09f4372db5a2	true	introspection.token.claim
49589373-3151-4d23-a72d-09f4372db5a2	true	userinfo.token.claim
49589373-3151-4d23-a72d-09f4372db5a2	profile	user.attribute
49589373-3151-4d23-a72d-09f4372db5a2	true	id.token.claim
49589373-3151-4d23-a72d-09f4372db5a2	true	access.token.claim
49589373-3151-4d23-a72d-09f4372db5a2	profile	claim.name
49589373-3151-4d23-a72d-09f4372db5a2	String	jsonType.label
5e9d8f98-64b5-4f9e-8a64-84f863551eda	true	introspection.token.claim
5e9d8f98-64b5-4f9e-8a64-84f863551eda	true	userinfo.token.claim
5e9d8f98-64b5-4f9e-8a64-84f863551eda	true	id.token.claim
5e9d8f98-64b5-4f9e-8a64-84f863551eda	true	access.token.claim
60b985aa-eb5a-46e3-9859-ceecea65b592	true	introspection.token.claim
60b985aa-eb5a-46e3-9859-ceecea65b592	true	userinfo.token.claim
60b985aa-eb5a-46e3-9859-ceecea65b592	firstName	user.attribute
60b985aa-eb5a-46e3-9859-ceecea65b592	true	id.token.claim
60b985aa-eb5a-46e3-9859-ceecea65b592	true	access.token.claim
60b985aa-eb5a-46e3-9859-ceecea65b592	given_name	claim.name
60b985aa-eb5a-46e3-9859-ceecea65b592	String	jsonType.label
7a6489f1-ecf1-4769-a09c-28f370a3ca90	true	introspection.token.claim
7a6489f1-ecf1-4769-a09c-28f370a3ca90	true	userinfo.token.claim
7a6489f1-ecf1-4769-a09c-28f370a3ca90	middleName	user.attribute
7a6489f1-ecf1-4769-a09c-28f370a3ca90	true	id.token.claim
7a6489f1-ecf1-4769-a09c-28f370a3ca90	true	access.token.claim
7a6489f1-ecf1-4769-a09c-28f370a3ca90	middle_name	claim.name
7a6489f1-ecf1-4769-a09c-28f370a3ca90	String	jsonType.label
91c803da-a789-47fa-9c01-eee6ac9551a6	true	introspection.token.claim
91c803da-a789-47fa-9c01-eee6ac9551a6	true	userinfo.token.claim
91c803da-a789-47fa-9c01-eee6ac9551a6	nickname	user.attribute
91c803da-a789-47fa-9c01-eee6ac9551a6	true	id.token.claim
91c803da-a789-47fa-9c01-eee6ac9551a6	true	access.token.claim
91c803da-a789-47fa-9c01-eee6ac9551a6	nickname	claim.name
91c803da-a789-47fa-9c01-eee6ac9551a6	String	jsonType.label
9356e133-c118-4436-9fd9-f2499485ab9c	true	introspection.token.claim
9356e133-c118-4436-9fd9-f2499485ab9c	true	userinfo.token.claim
9356e133-c118-4436-9fd9-f2499485ab9c	username	user.attribute
9356e133-c118-4436-9fd9-f2499485ab9c	true	id.token.claim
9356e133-c118-4436-9fd9-f2499485ab9c	true	access.token.claim
9356e133-c118-4436-9fd9-f2499485ab9c	preferred_username	claim.name
9356e133-c118-4436-9fd9-f2499485ab9c	String	jsonType.label
a5b10706-7730-4e4d-80f4-32b9e974c7b3	true	introspection.token.claim
a5b10706-7730-4e4d-80f4-32b9e974c7b3	true	userinfo.token.claim
a5b10706-7730-4e4d-80f4-32b9e974c7b3	website	user.attribute
a5b10706-7730-4e4d-80f4-32b9e974c7b3	true	id.token.claim
a5b10706-7730-4e4d-80f4-32b9e974c7b3	true	access.token.claim
a5b10706-7730-4e4d-80f4-32b9e974c7b3	website	claim.name
a5b10706-7730-4e4d-80f4-32b9e974c7b3	String	jsonType.label
c55368a7-9f84-49e2-93cb-e47e37e53a03	true	introspection.token.claim
c55368a7-9f84-49e2-93cb-e47e37e53a03	true	userinfo.token.claim
c55368a7-9f84-49e2-93cb-e47e37e53a03	locale	user.attribute
c55368a7-9f84-49e2-93cb-e47e37e53a03	true	id.token.claim
c55368a7-9f84-49e2-93cb-e47e37e53a03	true	access.token.claim
c55368a7-9f84-49e2-93cb-e47e37e53a03	locale	claim.name
c55368a7-9f84-49e2-93cb-e47e37e53a03	String	jsonType.label
f60cad2e-f41f-40dd-b643-1fb32502fb6f	true	introspection.token.claim
f60cad2e-f41f-40dd-b643-1fb32502fb6f	true	userinfo.token.claim
f60cad2e-f41f-40dd-b643-1fb32502fb6f	birthdate	user.attribute
f60cad2e-f41f-40dd-b643-1fb32502fb6f	true	id.token.claim
f60cad2e-f41f-40dd-b643-1fb32502fb6f	true	access.token.claim
f60cad2e-f41f-40dd-b643-1fb32502fb6f	birthdate	claim.name
f60cad2e-f41f-40dd-b643-1fb32502fb6f	String	jsonType.label
5ba3c479-3cc8-4689-92b3-1754caff496f	true	introspection.token.claim
5ba3c479-3cc8-4689-92b3-1754caff496f	true	userinfo.token.claim
5ba3c479-3cc8-4689-92b3-1754caff496f	emailVerified	user.attribute
5ba3c479-3cc8-4689-92b3-1754caff496f	true	id.token.claim
5ba3c479-3cc8-4689-92b3-1754caff496f	true	access.token.claim
5ba3c479-3cc8-4689-92b3-1754caff496f	email_verified	claim.name
5ba3c479-3cc8-4689-92b3-1754caff496f	boolean	jsonType.label
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	true	introspection.token.claim
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	true	userinfo.token.claim
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	email	user.attribute
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	true	id.token.claim
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	true	access.token.claim
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	email	claim.name
c999e4f0-c476-4e2b-a17c-8c8ea29fd1ff	String	jsonType.label
224c16f7-3553-4d97-82fc-e347c39ef856	formatted	user.attribute.formatted
224c16f7-3553-4d97-82fc-e347c39ef856	country	user.attribute.country
224c16f7-3553-4d97-82fc-e347c39ef856	true	introspection.token.claim
224c16f7-3553-4d97-82fc-e347c39ef856	postal_code	user.attribute.postal_code
224c16f7-3553-4d97-82fc-e347c39ef856	true	userinfo.token.claim
224c16f7-3553-4d97-82fc-e347c39ef856	street	user.attribute.street
224c16f7-3553-4d97-82fc-e347c39ef856	true	id.token.claim
224c16f7-3553-4d97-82fc-e347c39ef856	region	user.attribute.region
224c16f7-3553-4d97-82fc-e347c39ef856	true	access.token.claim
224c16f7-3553-4d97-82fc-e347c39ef856	locality	user.attribute.locality
61e3f19c-6e39-4922-a219-edaa4ee51079	true	introspection.token.claim
61e3f19c-6e39-4922-a219-edaa4ee51079	true	userinfo.token.claim
61e3f19c-6e39-4922-a219-edaa4ee51079	phoneNumber	user.attribute
61e3f19c-6e39-4922-a219-edaa4ee51079	true	id.token.claim
61e3f19c-6e39-4922-a219-edaa4ee51079	true	access.token.claim
61e3f19c-6e39-4922-a219-edaa4ee51079	phone_number	claim.name
61e3f19c-6e39-4922-a219-edaa4ee51079	String	jsonType.label
fbcde5eb-363c-4c16-8708-731d79c92699	true	introspection.token.claim
fbcde5eb-363c-4c16-8708-731d79c92699	true	userinfo.token.claim
fbcde5eb-363c-4c16-8708-731d79c92699	phoneNumberVerified	user.attribute
fbcde5eb-363c-4c16-8708-731d79c92699	true	id.token.claim
fbcde5eb-363c-4c16-8708-731d79c92699	true	access.token.claim
fbcde5eb-363c-4c16-8708-731d79c92699	phone_number_verified	claim.name
fbcde5eb-363c-4c16-8708-731d79c92699	boolean	jsonType.label
0b46a057-bd58-44c6-bfc5-0196b33a1ba8	true	introspection.token.claim
0b46a057-bd58-44c6-bfc5-0196b33a1ba8	true	access.token.claim
6ba21fc8-00ef-4b50-bce0-af0f09e20672	true	introspection.token.claim
6ba21fc8-00ef-4b50-bce0-af0f09e20672	true	multivalued
6ba21fc8-00ef-4b50-bce0-af0f09e20672	foo	user.attribute
6ba21fc8-00ef-4b50-bce0-af0f09e20672	true	access.token.claim
6ba21fc8-00ef-4b50-bce0-af0f09e20672	realm_access.roles	claim.name
6ba21fc8-00ef-4b50-bce0-af0f09e20672	String	jsonType.label
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	true	introspection.token.claim
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	true	multivalued
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	foo	user.attribute
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	true	access.token.claim
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	resource_access.${client_id}.roles	claim.name
c4d86a6b-26b0-4fbc-8b9c-94eb8d65c5a1	String	jsonType.label
a2d3e5e8-ae83-41ca-84ea-ea014d0e758d	true	introspection.token.claim
a2d3e5e8-ae83-41ca-84ea-ea014d0e758d	true	access.token.claim
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	true	introspection.token.claim
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	true	multivalued
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	foo	user.attribute
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	true	id.token.claim
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	true	access.token.claim
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	groups	claim.name
dbb2b99b-89e7-4447-9c8a-faf6b5af6f83	String	jsonType.label
e9fe3c37-ce58-4693-8249-7a67611e80b9	true	introspection.token.claim
e9fe3c37-ce58-4693-8249-7a67611e80b9	true	userinfo.token.claim
e9fe3c37-ce58-4693-8249-7a67611e80b9	username	user.attribute
e9fe3c37-ce58-4693-8249-7a67611e80b9	true	id.token.claim
e9fe3c37-ce58-4693-8249-7a67611e80b9	true	access.token.claim
e9fe3c37-ce58-4693-8249-7a67611e80b9	upn	claim.name
e9fe3c37-ce58-4693-8249-7a67611e80b9	String	jsonType.label
b4b203a2-3b83-4364-addd-b2c359823527	true	introspection.token.claim
b4b203a2-3b83-4364-addd-b2c359823527	true	id.token.claim
b4b203a2-3b83-4364-addd-b2c359823527	true	access.token.claim
193079b1-cb77-42cf-9e09-84f6ca9bad24	false	single
193079b1-cb77-42cf-9e09-84f6ca9bad24	Basic	attribute.nameformat
193079b1-cb77-42cf-9e09-84f6ca9bad24	Role	attribute.name
2f63702e-fd13-450b-a8f1-6741ac65aac2	true	introspection.token.claim
2f63702e-fd13-450b-a8f1-6741ac65aac2	true	userinfo.token.claim
2f63702e-fd13-450b-a8f1-6741ac65aac2	nickname	user.attribute
2f63702e-fd13-450b-a8f1-6741ac65aac2	true	id.token.claim
2f63702e-fd13-450b-a8f1-6741ac65aac2	true	access.token.claim
2f63702e-fd13-450b-a8f1-6741ac65aac2	nickname	claim.name
2f63702e-fd13-450b-a8f1-6741ac65aac2	String	jsonType.label
2f6ace20-b147-4320-b573-c586f558b204	true	introspection.token.claim
2f6ace20-b147-4320-b573-c586f558b204	true	userinfo.token.claim
2f6ace20-b147-4320-b573-c586f558b204	profile	user.attribute
2f6ace20-b147-4320-b573-c586f558b204	true	id.token.claim
2f6ace20-b147-4320-b573-c586f558b204	true	access.token.claim
2f6ace20-b147-4320-b573-c586f558b204	profile	claim.name
2f6ace20-b147-4320-b573-c586f558b204	String	jsonType.label
426323ab-034e-4175-8412-4e606a8c3d09	true	introspection.token.claim
426323ab-034e-4175-8412-4e606a8c3d09	true	userinfo.token.claim
426323ab-034e-4175-8412-4e606a8c3d09	username	user.attribute
426323ab-034e-4175-8412-4e606a8c3d09	true	id.token.claim
426323ab-034e-4175-8412-4e606a8c3d09	true	access.token.claim
426323ab-034e-4175-8412-4e606a8c3d09	preferred_username	claim.name
426323ab-034e-4175-8412-4e606a8c3d09	String	jsonType.label
4a0538c9-9a03-4319-b583-01e5a249c284	true	introspection.token.claim
4a0538c9-9a03-4319-b583-01e5a249c284	true	userinfo.token.claim
4a0538c9-9a03-4319-b583-01e5a249c284	lastName	user.attribute
4a0538c9-9a03-4319-b583-01e5a249c284	true	id.token.claim
4a0538c9-9a03-4319-b583-01e5a249c284	true	access.token.claim
4a0538c9-9a03-4319-b583-01e5a249c284	family_name	claim.name
4a0538c9-9a03-4319-b583-01e5a249c284	String	jsonType.label
7f193841-15f6-44ef-84e2-eee66272a866	true	introspection.token.claim
7f193841-15f6-44ef-84e2-eee66272a866	true	userinfo.token.claim
7f193841-15f6-44ef-84e2-eee66272a866	locale	user.attribute
7f193841-15f6-44ef-84e2-eee66272a866	true	id.token.claim
7f193841-15f6-44ef-84e2-eee66272a866	true	access.token.claim
7f193841-15f6-44ef-84e2-eee66272a866	locale	claim.name
7f193841-15f6-44ef-84e2-eee66272a866	String	jsonType.label
8efa74fd-11a4-4f82-8088-e173bdefa40e	true	introspection.token.claim
8efa74fd-11a4-4f82-8088-e173bdefa40e	true	userinfo.token.claim
8efa74fd-11a4-4f82-8088-e173bdefa40e	gender	user.attribute
8efa74fd-11a4-4f82-8088-e173bdefa40e	true	id.token.claim
8efa74fd-11a4-4f82-8088-e173bdefa40e	true	access.token.claim
8efa74fd-11a4-4f82-8088-e173bdefa40e	gender	claim.name
8efa74fd-11a4-4f82-8088-e173bdefa40e	String	jsonType.label
b5b4ce34-983d-4571-940a-997751002b47	true	introspection.token.claim
b5b4ce34-983d-4571-940a-997751002b47	true	userinfo.token.claim
b5b4ce34-983d-4571-940a-997751002b47	middleName	user.attribute
b5b4ce34-983d-4571-940a-997751002b47	true	id.token.claim
b5b4ce34-983d-4571-940a-997751002b47	true	access.token.claim
b5b4ce34-983d-4571-940a-997751002b47	middle_name	claim.name
b5b4ce34-983d-4571-940a-997751002b47	String	jsonType.label
c3e76a75-fdb5-46af-beb3-c953119198ed	true	introspection.token.claim
c3e76a75-fdb5-46af-beb3-c953119198ed	true	userinfo.token.claim
c3e76a75-fdb5-46af-beb3-c953119198ed	website	user.attribute
c3e76a75-fdb5-46af-beb3-c953119198ed	true	id.token.claim
c3e76a75-fdb5-46af-beb3-c953119198ed	true	access.token.claim
c3e76a75-fdb5-46af-beb3-c953119198ed	website	claim.name
c3e76a75-fdb5-46af-beb3-c953119198ed	String	jsonType.label
c601d371-25b3-48af-ac73-fea300ad70f6	true	introspection.token.claim
c601d371-25b3-48af-ac73-fea300ad70f6	true	userinfo.token.claim
c601d371-25b3-48af-ac73-fea300ad70f6	picture	user.attribute
c601d371-25b3-48af-ac73-fea300ad70f6	true	id.token.claim
c601d371-25b3-48af-ac73-fea300ad70f6	true	access.token.claim
c601d371-25b3-48af-ac73-fea300ad70f6	picture	claim.name
c601d371-25b3-48af-ac73-fea300ad70f6	String	jsonType.label
cd690425-78c1-4c25-a040-1e6d764e6905	true	introspection.token.claim
cd690425-78c1-4c25-a040-1e6d764e6905	true	userinfo.token.claim
cd690425-78c1-4c25-a040-1e6d764e6905	updatedAt	user.attribute
cd690425-78c1-4c25-a040-1e6d764e6905	true	id.token.claim
cd690425-78c1-4c25-a040-1e6d764e6905	true	access.token.claim
cd690425-78c1-4c25-a040-1e6d764e6905	updated_at	claim.name
cd690425-78c1-4c25-a040-1e6d764e6905	long	jsonType.label
d4b5b1a3-8f5b-4b89-a859-bbb676a4f6c4	true	introspection.token.claim
d4b5b1a3-8f5b-4b89-a859-bbb676a4f6c4	true	userinfo.token.claim
d4b5b1a3-8f5b-4b89-a859-bbb676a4f6c4	true	id.token.claim
d4b5b1a3-8f5b-4b89-a859-bbb676a4f6c4	true	access.token.claim
d66c1701-7231-4fe7-8190-7ffe649b7873	true	introspection.token.claim
d66c1701-7231-4fe7-8190-7ffe649b7873	true	userinfo.token.claim
d66c1701-7231-4fe7-8190-7ffe649b7873	zoneinfo	user.attribute
d66c1701-7231-4fe7-8190-7ffe649b7873	true	id.token.claim
d66c1701-7231-4fe7-8190-7ffe649b7873	true	access.token.claim
d66c1701-7231-4fe7-8190-7ffe649b7873	zoneinfo	claim.name
d66c1701-7231-4fe7-8190-7ffe649b7873	String	jsonType.label
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	true	introspection.token.claim
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	true	userinfo.token.claim
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	birthdate	user.attribute
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	true	id.token.claim
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	true	access.token.claim
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	birthdate	claim.name
e4647fa2-5ada-4d60-b47b-e8df5fc26a95	String	jsonType.label
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	true	introspection.token.claim
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	true	userinfo.token.claim
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	firstName	user.attribute
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	true	id.token.claim
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	true	access.token.claim
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	given_name	claim.name
fd55a87b-41a6-4a78-98d6-0a9a19e0c9b0	String	jsonType.label
67d7eb6f-11c3-48d5-9cde-5a679345ba46	true	introspection.token.claim
67d7eb6f-11c3-48d5-9cde-5a679345ba46	true	userinfo.token.claim
67d7eb6f-11c3-48d5-9cde-5a679345ba46	email	user.attribute
67d7eb6f-11c3-48d5-9cde-5a679345ba46	true	id.token.claim
67d7eb6f-11c3-48d5-9cde-5a679345ba46	true	access.token.claim
67d7eb6f-11c3-48d5-9cde-5a679345ba46	email	claim.name
67d7eb6f-11c3-48d5-9cde-5a679345ba46	String	jsonType.label
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	true	introspection.token.claim
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	true	userinfo.token.claim
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	emailVerified	user.attribute
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	true	id.token.claim
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	true	access.token.claim
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	email_verified	claim.name
ec3bf0c8-ac3b-4e69-b89e-6864fc18a306	boolean	jsonType.label
a26aa0aa-0d37-4df9-bfbf-6335d2361669	formatted	user.attribute.formatted
a26aa0aa-0d37-4df9-bfbf-6335d2361669	country	user.attribute.country
a26aa0aa-0d37-4df9-bfbf-6335d2361669	true	introspection.token.claim
a26aa0aa-0d37-4df9-bfbf-6335d2361669	postal_code	user.attribute.postal_code
a26aa0aa-0d37-4df9-bfbf-6335d2361669	true	userinfo.token.claim
a26aa0aa-0d37-4df9-bfbf-6335d2361669	street	user.attribute.street
a26aa0aa-0d37-4df9-bfbf-6335d2361669	true	id.token.claim
a26aa0aa-0d37-4df9-bfbf-6335d2361669	region	user.attribute.region
a26aa0aa-0d37-4df9-bfbf-6335d2361669	true	access.token.claim
a26aa0aa-0d37-4df9-bfbf-6335d2361669	locality	user.attribute.locality
9a1bde82-2ab3-49de-9e78-86261be9b151	true	introspection.token.claim
9a1bde82-2ab3-49de-9e78-86261be9b151	true	userinfo.token.claim
9a1bde82-2ab3-49de-9e78-86261be9b151	phoneNumberVerified	user.attribute
9a1bde82-2ab3-49de-9e78-86261be9b151	true	id.token.claim
9a1bde82-2ab3-49de-9e78-86261be9b151	true	access.token.claim
9a1bde82-2ab3-49de-9e78-86261be9b151	phone_number_verified	claim.name
9a1bde82-2ab3-49de-9e78-86261be9b151	boolean	jsonType.label
fc94e237-92fd-468f-a010-e2a7b0444222	true	introspection.token.claim
fc94e237-92fd-468f-a010-e2a7b0444222	true	userinfo.token.claim
fc94e237-92fd-468f-a010-e2a7b0444222	phoneNumber	user.attribute
fc94e237-92fd-468f-a010-e2a7b0444222	true	id.token.claim
fc94e237-92fd-468f-a010-e2a7b0444222	true	access.token.claim
fc94e237-92fd-468f-a010-e2a7b0444222	phone_number	claim.name
fc94e237-92fd-468f-a010-e2a7b0444222	String	jsonType.label
6e3c31c3-d078-45ab-948b-02f88e384a8d	true	introspection.token.claim
6e3c31c3-d078-45ab-948b-02f88e384a8d	true	multivalued
6e3c31c3-d078-45ab-948b-02f88e384a8d	foo	user.attribute
6e3c31c3-d078-45ab-948b-02f88e384a8d	true	access.token.claim
6e3c31c3-d078-45ab-948b-02f88e384a8d	resource_access.${client_id}.roles	claim.name
6e3c31c3-d078-45ab-948b-02f88e384a8d	String	jsonType.label
b53a7ff0-fefc-4546-aa21-8641750a3c80	true	introspection.token.claim
b53a7ff0-fefc-4546-aa21-8641750a3c80	true	access.token.claim
cd415720-db22-4cb3-a359-5ecff0828908	true	introspection.token.claim
cd415720-db22-4cb3-a359-5ecff0828908	true	multivalued
cd415720-db22-4cb3-a359-5ecff0828908	foo	user.attribute
cd415720-db22-4cb3-a359-5ecff0828908	true	access.token.claim
cd415720-db22-4cb3-a359-5ecff0828908	realm_access.roles	claim.name
cd415720-db22-4cb3-a359-5ecff0828908	String	jsonType.label
11967989-f9ea-4dd2-87f0-89de3722b6f6	true	introspection.token.claim
11967989-f9ea-4dd2-87f0-89de3722b6f6	true	access.token.claim
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	true	introspection.token.claim
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	true	userinfo.token.claim
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	username	user.attribute
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	true	id.token.claim
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	true	access.token.claim
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	upn	claim.name
0cb6b27b-7aa5-48b9-8fe6-895cfebb1a82	String	jsonType.label
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	true	introspection.token.claim
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	true	multivalued
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	foo	user.attribute
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	true	id.token.claim
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	true	access.token.claim
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	groups	claim.name
b6b480c3-17ba-4fdb-b1a8-aa7b8965e94c	String	jsonType.label
86737549-673a-44d2-8736-76b35e4511c9	true	introspection.token.claim
86737549-673a-44d2-8736-76b35e4511c9	true	id.token.claim
86737549-673a-44d2-8736-76b35e4511c9	true	access.token.claim
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	true	introspection.token.claim
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	true	userinfo.token.claim
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	locale	user.attribute
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	true	id.token.claim
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	true	access.token.claim
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	locale	claim.name
92a4dc7c-f06a-4f80-99f0-cfcc8c32bc50	String	jsonType.label
0f71712b-338c-49c2-a092-e0e072692de7	clientAddress	user.session.note
0f71712b-338c-49c2-a092-e0e072692de7	true	introspection.token.claim
0f71712b-338c-49c2-a092-e0e072692de7	true	id.token.claim
0f71712b-338c-49c2-a092-e0e072692de7	true	access.token.claim
0f71712b-338c-49c2-a092-e0e072692de7	clientAddress	claim.name
0f71712b-338c-49c2-a092-e0e072692de7	String	jsonType.label
3781216b-f385-4b9e-b7ff-f30f628a1040	client_id	user.session.note
3781216b-f385-4b9e-b7ff-f30f628a1040	true	introspection.token.claim
3781216b-f385-4b9e-b7ff-f30f628a1040	true	id.token.claim
3781216b-f385-4b9e-b7ff-f30f628a1040	true	access.token.claim
3781216b-f385-4b9e-b7ff-f30f628a1040	client_id	claim.name
3781216b-f385-4b9e-b7ff-f30f628a1040	String	jsonType.label
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	clientHost	user.session.note
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	true	introspection.token.claim
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	true	id.token.claim
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	true	access.token.claim
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	clientHost	claim.name
ebe32ae1-5b7c-4eef-8beb-7f6599eca9cc	String	jsonType.label
41d29ac8-8116-44c4-9e70-65e42b993e1a	projecthub-backend	included.client.audience
41d29ac8-8116-44c4-9e70-65e42b993e1a	false	id.token.claim
41d29ac8-8116-44c4-9e70-65e42b993e1a	true	access.token.claim
41d29ac8-8116-44c4-9e70-65e42b993e1a	true	introspection.token.claim
\.


--
-- Data for Name: realm; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm (id, access_code_lifespan, user_action_lifespan, access_token_lifespan, account_theme, admin_theme, email_theme, enabled, events_enabled, events_expiration, login_theme, name, not_before, password_policy, registration_allowed, remember_me, reset_password_allowed, social, ssl_required, sso_idle_timeout, sso_max_lifespan, update_profile_on_soc_login, verify_email, master_admin_client, login_lifespan, internationalization_enabled, default_locale, reg_email_as_username, admin_events_enabled, admin_events_details_enabled, edit_username_allowed, otp_policy_counter, otp_policy_window, otp_policy_period, otp_policy_digits, otp_policy_alg, otp_policy_type, browser_flow, registration_flow, direct_grant_flow, reset_credentials_flow, client_auth_flow, offline_session_idle_timeout, revoke_refresh_token, access_token_life_implicit, login_with_email_allowed, duplicate_emails_allowed, docker_auth_flow, refresh_token_max_reuse, allow_user_managed_access, sso_max_lifespan_remember_me, sso_idle_timeout_remember_me, default_role) FROM stdin;
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	60	300	300	keycloak.v2			t	f	0	meu-tema	projecthub	0	\N	f	f	f	f	EXTERNAL	1800	36000	f	f	d97ba5d6-d1e5-4ac9-8e70-852394afb542	1800	t	pt-BR	f	f	f	f	0	1	30	6	HmacSHA1	totp	e2872534-b129-484f-a0e5-a0896b5a6c4a	520da3d3-98c7-4f1d-baf9-6270bc787c5c	ee706fa2-3180-4ead-a5c0-10ae1aaf9792	68bbfdb1-6a70-45c9-b6d9-2ef62b6925fb	c2d9f4b8-c337-477b-8cf0-94f6f73553d3	2592000	f	900	t	f	6a3ca839-c6b5-4a60-a1f9-953eb98d3c46	0	f	0	0	158ee450-2830-4a46-ad19-6ebacc1712f5
81ce423f-6d27-457d-908e-6ad3e5d50ea2	60	300	60	\N	\N	\N	t	f	0	\N	master	0	\N	f	f	f	f	EXTERNAL	1800	36000	f	f	7dfa79e6-c891-4fc2-9df7-77932d7b98e1	1800	f	\N	f	f	f	f	0	1	30	6	HmacSHA1	totp	4ba39979-6543-4b27-ad49-939717a02ada	cc8a7a03-4bbb-44d7-9b56-d6b4dc5c5903	695e6ecb-0fbc-4630-af27-b53520bcbbe5	e051a36e-f974-4422-a565-3f8e63d5294f	c9968038-99ee-4c38-a81e-4d110f7f239b	2592000	f	900	t	f	12fd4eaa-037f-4a96-946f-532fdbb6bea2	0	f	0	0	12cc11c1-22aa-4e02-b889-c351e7c8007c
\.


--
-- Data for Name: realm_attribute; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_attribute (name, realm_id, value) FROM stdin;
_browser_header.contentSecurityPolicyReportOnly	81ce423f-6d27-457d-908e-6ad3e5d50ea2	
_browser_header.xContentTypeOptions	81ce423f-6d27-457d-908e-6ad3e5d50ea2	nosniff
_browser_header.referrerPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	no-referrer
_browser_header.xRobotsTag	81ce423f-6d27-457d-908e-6ad3e5d50ea2	none
_browser_header.xFrameOptions	81ce423f-6d27-457d-908e-6ad3e5d50ea2	SAMEORIGIN
_browser_header.contentSecurityPolicy	81ce423f-6d27-457d-908e-6ad3e5d50ea2	frame-src 'self'; frame-ancestors 'self'; object-src 'none';
_browser_header.xXSSProtection	81ce423f-6d27-457d-908e-6ad3e5d50ea2	1; mode=block
_browser_header.strictTransportSecurity	81ce423f-6d27-457d-908e-6ad3e5d50ea2	max-age=31536000; includeSubDomains
bruteForceProtected	81ce423f-6d27-457d-908e-6ad3e5d50ea2	false
permanentLockout	81ce423f-6d27-457d-908e-6ad3e5d50ea2	false
maxFailureWaitSeconds	81ce423f-6d27-457d-908e-6ad3e5d50ea2	900
minimumQuickLoginWaitSeconds	81ce423f-6d27-457d-908e-6ad3e5d50ea2	60
waitIncrementSeconds	81ce423f-6d27-457d-908e-6ad3e5d50ea2	60
quickLoginCheckMilliSeconds	81ce423f-6d27-457d-908e-6ad3e5d50ea2	1000
maxDeltaTimeSeconds	81ce423f-6d27-457d-908e-6ad3e5d50ea2	43200
failureFactor	81ce423f-6d27-457d-908e-6ad3e5d50ea2	30
realmReusableOtpCode	81ce423f-6d27-457d-908e-6ad3e5d50ea2	false
displayName	81ce423f-6d27-457d-908e-6ad3e5d50ea2	Keycloak
displayNameHtml	81ce423f-6d27-457d-908e-6ad3e5d50ea2	<div class="kc-logo-text"><span>Keycloak</span></div>
defaultSignatureAlgorithm	81ce423f-6d27-457d-908e-6ad3e5d50ea2	RS256
offlineSessionMaxLifespanEnabled	81ce423f-6d27-457d-908e-6ad3e5d50ea2	false
offlineSessionMaxLifespan	81ce423f-6d27-457d-908e-6ad3e5d50ea2	5184000
realmReusableOtpCode	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	false
oauth2DeviceCodeLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	600
oauth2DevicePollingInterval	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	5
cibaBackchannelTokenDeliveryMode	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	poll
cibaExpiresIn	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	120
cibaInterval	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	5
cibaAuthRequestedUserHint	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	login_hint
parRequestUriLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	60
bruteForceProtected	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	false
permanentLockout	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	false
maxFailureWaitSeconds	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	900
minimumQuickLoginWaitSeconds	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	60
waitIncrementSeconds	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	60
quickLoginCheckMilliSeconds	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	1000
clientSessionIdleTimeout	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0
clientSessionMaxLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0
clientOfflineSessionIdleTimeout	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0
clientOfflineSessionMaxLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0
maxDeltaTimeSeconds	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	43200
failureFactor	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	30
actionTokenGeneratedByAdminLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	43200
actionTokenGeneratedByUserLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	300
defaultSignatureAlgorithm	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	RS256
offlineSessionMaxLifespanEnabled	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	false
offlineSessionMaxLifespan	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	5184000
webAuthnPolicyRpEntityName	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	keycloak
webAuthnPolicySignatureAlgorithms	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	ES256
webAuthnPolicyRpId	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	
webAuthnPolicyAttestationConveyancePreference	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyAuthenticatorAttachment	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyRequireResidentKey	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyUserVerificationRequirement	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyCreateTimeout	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0
webAuthnPolicyAvoidSameAuthenticatorRegister	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	false
webAuthnPolicyRpEntityNamePasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	keycloak
webAuthnPolicySignatureAlgorithmsPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	ES256
webAuthnPolicyRpIdPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	
webAuthnPolicyAttestationConveyancePreferencePasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyAuthenticatorAttachmentPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyRequireResidentKeyPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyUserVerificationRequirementPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	not specified
webAuthnPolicyCreateTimeoutPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	0
webAuthnPolicyAvoidSameAuthenticatorRegisterPasswordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	false
client-policies.profiles	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	{"profiles":[]}
client-policies.policies	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	{"policies":[]}
_browser_header.contentSecurityPolicyReportOnly	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	
_browser_header.xContentTypeOptions	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	nosniff
_browser_header.referrerPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	no-referrer
_browser_header.xRobotsTag	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	none
_browser_header.xFrameOptions	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	SAMEORIGIN
_browser_header.contentSecurityPolicy	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	frame-src 'self'; frame-ancestors 'self'; object-src 'none';
_browser_header.xXSSProtection	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	1; mode=block
_browser_header.strictTransportSecurity	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	max-age=31536000; includeSubDomains
\.


--
-- Data for Name: realm_default_groups; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_default_groups (realm_id, group_id) FROM stdin;
\.


--
-- Data for Name: realm_enabled_event_types; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_enabled_event_types (realm_id, value) FROM stdin;
\.


--
-- Data for Name: realm_events_listeners; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_events_listeners (realm_id, value) FROM stdin;
81ce423f-6d27-457d-908e-6ad3e5d50ea2	jboss-logging
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	jboss-logging
\.


--
-- Data for Name: realm_localizations; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_localizations (realm_id, locale, texts) FROM stdin;
\.


--
-- Data for Name: realm_required_credential; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_required_credential (type, form_label, input, secret, realm_id) FROM stdin;
password	password	t	t	81ce423f-6d27-457d-908e-6ad3e5d50ea2
password	password	t	t	55599141-ecd7-4537-b4aa-4abaa9ee0ba2
\.


--
-- Data for Name: realm_smtp_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_smtp_config (realm_id, value, name) FROM stdin;
\.


--
-- Data for Name: realm_supported_locales; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.realm_supported_locales (realm_id, value) FROM stdin;
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	pt-BR
55599141-ecd7-4537-b4aa-4abaa9ee0ba2	en
\.


--
-- Data for Name: redirect_uris; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.redirect_uris (client_id, value) FROM stdin;
289cc572-5dd8-4eef-ad7c-cdf72368d79f	/realms/master/account/*
f92a3457-b0d6-46eb-94c7-73e800c4bec0	/realms/master/account/*
5ed82a86-ee2d-4a26-9cfe-96894d665876	/admin/master/console/*
c7ebbe7d-02f6-4456-b94f-2bbbc99d3a4e	/realms/projecthub/account/*
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	/realms/projecthub/account/*
adfad328-7317-45a3-a350-ac722c036de9	/admin/projecthub/console/*
0ddc2e3b-80ec-4439-a912-9bfbff102504	/*
e29200a5-a570-4ff9-89aa-1383abbff2ca	http://127.0.0.1:*
e29200a5-a570-4ff9-89aa-1383abbff2ca	http://localhost/
e29200a5-a570-4ff9-89aa-1383abbff2ca	http://localhost:5173/*
e29200a5-a570-4ff9-89aa-1383abbff2ca	http://localhost
e29200a5-a570-4ff9-89aa-1383abbff2ca	http://localhost:5173
\.


--
-- Data for Name: required_action_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.required_action_config (required_action_id, value, name) FROM stdin;
\.


--
-- Data for Name: required_action_provider; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.required_action_provider (id, alias, name, realm_id, enabled, default_action, provider_id, priority) FROM stdin;
7b95da24-8208-4aae-848a-8feaca5e1da2	VERIFY_EMAIL	Verify Email	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	VERIFY_EMAIL	50
e4f40412-ae55-4582-8cef-9d99304335af	UPDATE_PROFILE	Update Profile	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	UPDATE_PROFILE	40
1b303dfe-4f7e-482b-8623-30f5453eb1d8	CONFIGURE_TOTP	Configure OTP	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	CONFIGURE_TOTP	10
64a01db3-d58c-4439-bbc9-993cdc4e20c0	UPDATE_PASSWORD	Update Password	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	UPDATE_PASSWORD	30
70e87399-685a-49c2-b408-ae08ffb896ee	TERMS_AND_CONDITIONS	Terms and Conditions	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	f	TERMS_AND_CONDITIONS	20
77bcf751-0710-41f4-8607-bb53d313d5a0	delete_account	Delete Account	81ce423f-6d27-457d-908e-6ad3e5d50ea2	f	f	delete_account	60
3c47aa26-b79e-4759-87c6-30498253e8ad	update_user_locale	Update User Locale	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	update_user_locale	1000
d8c2c09f-9106-4a0f-ac3d-26397b7a1e50	webauthn-register	Webauthn Register	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	webauthn-register	70
2e83d0b4-8fdf-43a6-9e0d-931cd48f5cd8	webauthn-register-passwordless	Webauthn Register Passwordless	81ce423f-6d27-457d-908e-6ad3e5d50ea2	t	f	webauthn-register-passwordless	80
39db2820-248f-4ae8-bbf6-9784f9e64cdc	VERIFY_EMAIL	Verify Email	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	VERIFY_EMAIL	50
a056ac06-4341-4fa0-b1c5-cad4b23701a9	UPDATE_PROFILE	Update Profile	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	UPDATE_PROFILE	40
e04dc44a-fb19-4bbe-917c-4beac43b6a32	CONFIGURE_TOTP	Configure OTP	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	CONFIGURE_TOTP	10
d05c2d55-7d0e-41d6-b7d0-5e6828194303	UPDATE_PASSWORD	Update Password	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	UPDATE_PASSWORD	30
4b54c522-8728-41eb-a96a-d263de4e8c77	TERMS_AND_CONDITIONS	Terms and Conditions	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	f	f	TERMS_AND_CONDITIONS	20
e1ebe2e0-7287-4389-8e69-9c17a1419a0a	delete_account	Delete Account	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	f	f	delete_account	60
57d9021f-8500-4beb-a290-6cc6fa7b9a85	update_user_locale	Update User Locale	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	update_user_locale	1000
4c1d5cf2-06ee-4fe1-b999-eb80ff9382eb	webauthn-register	Webauthn Register	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	webauthn-register	70
229219eb-58a9-428e-8756-9db1b01a9926	webauthn-register-passwordless	Webauthn Register Passwordless	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	t	f	webauthn-register-passwordless	80
\.


--
-- Data for Name: resource_attribute; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_attribute (id, name, value, resource_id) FROM stdin;
\.


--
-- Data for Name: resource_policy; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_policy (resource_id, policy_id) FROM stdin;
\.


--
-- Data for Name: resource_scope; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_scope (resource_id, scope_id) FROM stdin;
\.


--
-- Data for Name: resource_server; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_server (id, allow_rs_remote_mgmt, policy_enforce_mode, decision_strategy) FROM stdin;
\.


--
-- Data for Name: resource_server_perm_ticket; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_server_perm_ticket (id, owner, requester, created_timestamp, granted_timestamp, resource_id, scope_id, resource_server_id, policy_id) FROM stdin;
\.


--
-- Data for Name: resource_server_policy; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_server_policy (id, name, description, type, decision_strategy, logic, resource_server_id, owner) FROM stdin;
\.


--
-- Data for Name: resource_server_resource; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_server_resource (id, name, type, icon_uri, owner, resource_server_id, owner_managed_access, display_name) FROM stdin;
\.


--
-- Data for Name: resource_server_scope; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_server_scope (id, name, icon_uri, resource_server_id, display_name) FROM stdin;
\.


--
-- Data for Name: resource_uris; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.resource_uris (resource_id, value) FROM stdin;
\.


--
-- Data for Name: role_attribute; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.role_attribute (id, role_id, name, value) FROM stdin;
\.


--
-- Data for Name: scope_mapping; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.scope_mapping (client_id, role_id) FROM stdin;
f92a3457-b0d6-46eb-94c7-73e800c4bec0	b4aeb7d2-4691-4e28-b713-b8e2514644b3
f92a3457-b0d6-46eb-94c7-73e800c4bec0	12736e09-f666-41fd-a9a4-29cfe207f0f0
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	29d5cad4-ac12-4ee3-840b-7aaa3c1f7d69
d0d3e753-09cf-4095-bbaf-2d1c4888a07f	22828d60-b96e-400c-b666-290f0114b2a2
\.


--
-- Data for Name: scope_policy; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.scope_policy (scope_id, policy_id) FROM stdin;
\.


--
-- Data for Name: user_attribute; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_attribute (name, value, user_id, id) FROM stdin;
\.


--
-- Data for Name: user_consent; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_consent (id, client_id, user_id, created_date, last_updated_date, client_storage_provider, external_client_id) FROM stdin;
\.


--
-- Data for Name: user_consent_client_scope; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_consent_client_scope (user_consent_id, scope_id) FROM stdin;
\.


--
-- Data for Name: user_entity; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_entity (id, email, email_constraint, email_verified, enabled, federation_link, first_name, last_name, realm_id, username, created_timestamp, service_account_client_link, not_before) FROM stdin;
d38a8142-1fac-48e9-a850-20049175f826	\N	a4b5a7a7-386e-4b0b-bcf2-f3ab695a838a	f	t	\N	\N	\N	81ce423f-6d27-457d-908e-6ad3e5d50ea2	admin	1772741096346	\N	0
e728678b-8740-4867-8a6d-b6dfb2caf3cb	\N	b0c4ed70-b1f0-4b21-8ffb-24402d86f6c7	f	t	\N	\N	\N	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	service-account-projecthub-backend	1772741535420	0ddc2e3b-80ec-4439-a912-9bfbff102504	0
d481ca75-1625-450a-89fe-1604b7844b46	admin@projecthub.local	admin@projecthub.local	t	t	\N	admin	local	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	admin	1772746445977	\N	0
91e0f549-d6c6-4f79-8bdf-15491558489f	anacs@novohamburgo.rs.gov.br	anacs@novohamburgo.rs.gov.br	t	t	\N	Ana	Schuch	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	ana	1773238079456	\N	0
b04ef91d-8152-46a2-8a2a-e9628c7d3d94	sistemas@novohamburgo.rs.gov.br	sistemas@novohamburgo.rs.gov.br	t	t	\N	Roberto	Geiss	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	roberto	1773238002614	\N	0
8b60bf40-c45d-4481-b24b-36690db0da20	anderson@novohamburgo.rs.gov.br	anderson@novohamburgo.rs.gov.br	t	t	\N	Anderson	Carneiro	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	anderson	1773243384031	\N	0
bfb99526-9e71-420c-8b1a-4a1dbaf64dc1	dev@novohamburgo.rs.gov.br	dev@novohamburgo.rs.gov.br	t	t	\N	Roberto	Geiss	55599141-ecd7-4537-b4aa-4abaa9ee0ba2	dev	1775483079711	\N	0
\.


--
-- Data for Name: user_federation_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_federation_config (user_federation_provider_id, value, name) FROM stdin;
\.


--
-- Data for Name: user_federation_mapper; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_federation_mapper (id, name, federation_provider_id, federation_mapper_type, realm_id) FROM stdin;
\.


--
-- Data for Name: user_federation_mapper_config; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_federation_mapper_config (user_federation_mapper_id, value, name) FROM stdin;
\.


--
-- Data for Name: user_federation_provider; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_federation_provider (id, changed_sync_period, display_name, full_sync_period, last_sync, priority, provider_name, realm_id) FROM stdin;
\.


--
-- Data for Name: user_group_membership; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_group_membership (group_id, user_id) FROM stdin;
\.


--
-- Data for Name: user_required_action; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_required_action (user_id, required_action) FROM stdin;
\.


--
-- Data for Name: user_role_mapping; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_role_mapping (role_id, user_id) FROM stdin;
12cc11c1-22aa-4e02-b889-c351e7c8007c	d38a8142-1fac-48e9-a850-20049175f826
5bb963b1-9657-42c9-8954-2c3a31a07699	d38a8142-1fac-48e9-a850-20049175f826
ec22bf26-7b0b-4cce-8a9d-221fec39f0fb	d38a8142-1fac-48e9-a850-20049175f826
a505c6e5-e02b-4209-a47f-155031d25ebd	d38a8142-1fac-48e9-a850-20049175f826
6eaca463-b3b9-48b2-8986-f6931a5071fc	d38a8142-1fac-48e9-a850-20049175f826
5f706167-bddc-4406-8bf4-7c44739625ec	d38a8142-1fac-48e9-a850-20049175f826
19b9371d-788d-42ab-9bdc-b4173c992c87	d38a8142-1fac-48e9-a850-20049175f826
70232603-0058-45bf-8673-6c742f11a07d	d38a8142-1fac-48e9-a850-20049175f826
7a7a8911-069d-4c75-9cb7-2777b0e543a4	d38a8142-1fac-48e9-a850-20049175f826
de53c114-428f-442a-9235-e3359f156e95	d38a8142-1fac-48e9-a850-20049175f826
80634488-0368-4d9f-8dce-2b37ad958447	d38a8142-1fac-48e9-a850-20049175f826
ca44eb80-79aa-4b2f-88de-5ea37c64dbce	d38a8142-1fac-48e9-a850-20049175f826
1f0ef04e-3cd9-4a53-9642-f47ae0da0bec	d38a8142-1fac-48e9-a850-20049175f826
754584d3-3ce4-44bb-b9d6-8003e4a76df1	d38a8142-1fac-48e9-a850-20049175f826
436b59c6-aae6-42f2-8b8c-940627a8b24c	d38a8142-1fac-48e9-a850-20049175f826
5da57500-29f1-43b0-9fe5-52ed147149c7	d38a8142-1fac-48e9-a850-20049175f826
636e94d4-3d41-47de-b3e6-c9e90158b020	d38a8142-1fac-48e9-a850-20049175f826
0fd8c972-e225-4a7a-a63e-1d5b64afb09e	d38a8142-1fac-48e9-a850-20049175f826
bb2a5d0e-a8c2-4d15-9f44-e362204733d8	d38a8142-1fac-48e9-a850-20049175f826
158ee450-2830-4a46-ad19-6ebacc1712f5	e728678b-8740-4867-8a6d-b6dfb2caf3cb
158ee450-2830-4a46-ad19-6ebacc1712f5	d481ca75-1625-450a-89fe-1604b7844b46
158ee450-2830-4a46-ad19-6ebacc1712f5	b04ef91d-8152-46a2-8a2a-e9628c7d3d94
158ee450-2830-4a46-ad19-6ebacc1712f5	91e0f549-d6c6-4f79-8bdf-15491558489f
158ee450-2830-4a46-ad19-6ebacc1712f5	8b60bf40-c45d-4481-b24b-36690db0da20
158ee450-2830-4a46-ad19-6ebacc1712f5	bfb99526-9e71-420c-8b1a-4a1dbaf64dc1
\.


--
-- Data for Name: user_session; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_session (id, auth_method, ip_address, last_session_refresh, login_username, realm_id, remember_me, started, user_id, user_session_state, broker_session_id, broker_user_id) FROM stdin;
\.


--
-- Data for Name: user_session_note; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.user_session_note (user_session, name, value) FROM stdin;
\.


--
-- Data for Name: username_login_failure; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.username_login_failure (realm_id, username, failed_login_not_before, last_failure, last_ip_failure, num_failures) FROM stdin;
\.


--
-- Data for Name: web_origins; Type: TABLE DATA; Schema: keycloak; Owner: projecthub
--

COPY keycloak.web_origins (client_id, value) FROM stdin;
5ed82a86-ee2d-4a26-9cfe-96894d665876	+
adfad328-7317-45a3-a350-ac722c036de9	+
0ddc2e3b-80ec-4439-a912-9bfbff102504	/*
e29200a5-a570-4ff9-89aa-1383abbff2ca	*
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.audit_logs (id, workspace_id, actor_id, action, entity_type, entity_id, entity_name, ip_address, user_agent, changes, created_at) FROM stdin;
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add user	4	add_user
14	Can change user	4	change_user
15	Can delete user	4	delete_user
16	Can view user	4	view_user
17	Can add content type	5	add_contenttype
18	Can change content type	5	change_contenttype
19	Can delete content type	5	delete_contenttype
20	Can view content type	5	view_contenttype
21	Can add session	6	add_session
22	Can change session	6	change_session
23	Can delete session	6	delete_session
24	Can view session	6	view_session
25	Can add crontab	7	add_crontabschedule
26	Can change crontab	7	change_crontabschedule
27	Can delete crontab	7	delete_crontabschedule
28	Can view crontab	7	view_crontabschedule
29	Can add interval	8	add_intervalschedule
30	Can change interval	8	change_intervalschedule
31	Can delete interval	8	delete_intervalschedule
32	Can view interval	8	view_intervalschedule
33	Can add periodic task	9	add_periodictask
34	Can change periodic task	9	change_periodictask
35	Can delete periodic task	9	delete_periodictask
36	Can view periodic task	9	view_periodictask
37	Can add periodic task track	10	add_periodictasks
38	Can change periodic task track	10	change_periodictasks
39	Can delete periodic task track	10	delete_periodictasks
40	Can view periodic task track	10	view_periodictasks
41	Can add solar event	11	add_solarschedule
42	Can change solar event	11	change_solarschedule
43	Can delete solar event	11	delete_solarschedule
44	Can view solar event	11	view_solarschedule
45	Can add clocked	12	add_clockedschedule
46	Can change clocked	12	change_clockedschedule
47	Can delete clocked	12	delete_clockedschedule
48	Can view clocked	12	view_clockedschedule
49	Can add task result	13	add_taskresult
50	Can change task result	13	change_taskresult
51	Can delete task result	13	delete_taskresult
52	Can view task result	13	view_taskresult
53	Can add chord counter	14	add_chordcounter
54	Can change chord counter	14	change_chordcounter
55	Can delete chord counter	14	delete_chordcounter
56	Can view chord counter	14	view_chordcounter
57	Can add group result	15	add_groupresult
58	Can change group result	15	change_groupresult
59	Can delete group result	15	delete_groupresult
60	Can view group result	15	view_groupresult
61	Can add test model	16	add_testmodel
62	Can change test model	16	change_testmodel
63	Can delete test model	16	delete_testmodel
64	Can view test model	16	view_testmodel
65	Can add milestone	17	add_milestone
66	Can change milestone	17	change_milestone
67	Can delete milestone	17	delete_milestone
68	Can view milestone	17	view_milestone
69	Can add risk	18	add_risk
70	Can change risk	18	change_risk
71	Can delete risk	18	delete_risk
72	Can view risk	18	view_risk
73	Can add workspace	19	add_workspace
74	Can change workspace	19	change_workspace
75	Can delete workspace	19	delete_workspace
76	Can view workspace	19	view_workspace
77	Can add workspace member	20	add_workspacemember
78	Can change workspace member	20	change_workspacemember
79	Can delete workspace member	20	delete_workspacemember
80	Can view workspace member	20	view_workspacemember
81	Can add project	21	add_project
82	Can change project	21	change_project
83	Can delete project	21	delete_project
84	Can view project	21	view_project
85	Can add label	22	add_label
86	Can change label	22	change_label
87	Can delete label	22	delete_label
88	Can view label	22	view_label
89	Can add issue state	23	add_issuestate
90	Can change issue state	23	change_issuestate
91	Can delete issue state	23	delete_issuestate
92	Can view issue state	23	view_issuestate
93	Can add project member	24	add_projectmember
94	Can change project member	24	change_projectmember
95	Can delete project member	24	delete_projectmember
96	Can view project member	24	view_projectmember
97	Can add issue	25	add_issue
98	Can change issue	25	change_issue
99	Can delete issue	25	delete_issue
100	Can view issue	25	view_issue
101	Can add issue activity	26	add_issueactivity
102	Can change issue activity	26	change_issueactivity
103	Can delete issue activity	26	delete_issueactivity
104	Can view issue activity	26	view_issueactivity
105	Can add issue attachment	27	add_issueattachment
106	Can change issue attachment	27	change_issueattachment
107	Can delete issue attachment	27	delete_issueattachment
108	Can view issue attachment	27	view_issueattachment
109	Can add issue comment	28	add_issuecomment
110	Can change issue comment	28	change_issuecomment
111	Can delete issue comment	28	delete_issuecomment
112	Can view issue comment	28	view_issuecomment
113	Can add issue label	29	add_issuelabel
114	Can change issue label	29	change_issuelabel
115	Can delete issue label	29	delete_issuelabel
116	Can view issue label	29	view_issuelabel
117	Can add issue relation	30	add_issuerelation
118	Can change issue relation	30	change_issuerelation
119	Can delete issue relation	30	delete_issuerelation
120	Can view issue relation	30	view_issuerelation
121	Can add cycle	31	add_cycle
122	Can change cycle	31	change_cycle
123	Can delete cycle	31	delete_cycle
124	Can view cycle	31	view_cycle
125	Can add cycle issue	32	add_cycleissue
126	Can change cycle issue	32	change_cycleissue
127	Can delete cycle issue	32	delete_cycleissue
128	Can view cycle issue	32	view_cycleissue
129	Can add module	33	add_module
130	Can change module	33	change_module
131	Can delete module	33	delete_module
132	Can view module	33	view_module
133	Can add module issue	34	add_moduleissue
134	Can change module issue	34	change_moduleissue
135	Can delete module issue	34	delete_moduleissue
136	Can view module issue	34	view_moduleissue
137	Can add wiki page	35	add_wikipage
138	Can change wiki page	35	change_wikipage
139	Can delete wiki page	35	delete_wikipage
140	Can view wiki page	35	view_wikipage
141	Can add wiki page comment	36	add_wikipagecomment
142	Can change wiki page comment	36	change_wikipagecomment
143	Can delete wiki page comment	36	delete_wikipagecomment
144	Can view wiki page comment	36	view_wikipagecomment
145	Can add wiki page version	37	add_wikipageversion
146	Can change wiki page version	37	change_wikipageversion
147	Can delete wiki page version	37	delete_wikipageversion
148	Can view wiki page version	37	view_wikipageversion
149	Can add wiki space	38	add_wikispace
150	Can change wiki space	38	change_wikispace
151	Can delete wiki space	38	delete_wikispace
152	Can view wiki space	38	view_wikispace
153	Can add wiki issue link	39	add_wikiissuelink
154	Can change wiki issue link	39	change_wikiissuelink
155	Can delete wiki issue link	39	delete_wikiissuelink
156	Can view wiki issue link	39	view_wikiissuelink
157	Can add notification	40	add_notification
158	Can change notification	40	change_notification
159	Can delete notification	40	delete_notification
160	Can view notification	40	view_notification
161	Can add cpm issue data	41	add_cpmissuedata
162	Can change cpm issue data	41	change_cpmissuedata
163	Can delete cpm issue data	41	delete_cpmissuedata
164	Can view cpm issue data	41	view_cpmissuedata
165	Can add cpm baseline	42	add_cpmbaseline
166	Can change cpm baseline	42	change_cpmbaseline
167	Can delete cpm baseline	42	delete_cpmbaseline
168	Can view cpm baseline	42	view_cpmbaseline
169	Can add portfolio	43	add_portfolio
170	Can change portfolio	43	change_portfolio
171	Can delete portfolio	43	delete_portfolio
172	Can view portfolio	43	view_portfolio
173	Can add portfolio objective	44	add_portfolioobjective
174	Can change portfolio objective	44	change_portfolioobjective
175	Can delete portfolio objective	44	delete_portfolioobjective
176	Can view portfolio objective	44	view_portfolioobjective
177	Can add portfolio project	45	add_portfolioproject
178	Can change portfolio project	45	change_portfolioproject
179	Can delete portfolio project	45	delete_portfolioproject
180	Can view portfolio project	45	view_portfolioproject
181	Can add portfolio cost entry	46	add_portfoliocostentry
182	Can change portfolio cost entry	46	change_portfoliocostentry
183	Can delete portfolio cost entry	46	delete_portfoliocostentry
184	Can view portfolio cost entry	46	view_portfoliocostentry
185	Can add portfolio project dep	47	add_portfolioprojectdep
186	Can change portfolio project dep	47	change_portfolioprojectdep
187	Can delete portfolio project dep	47	delete_portfolioprojectdep
188	Can view portfolio project dep	47	view_portfolioprojectdep
189	Can add objective project	48	add_objectiveproject
190	Can change objective project	48	change_objectiveproject
191	Can delete objective project	48	delete_objectiveproject
192	Can view objective project	48	view_objectiveproject
193	Can add resource profile	49	add_resourceprofile
194	Can change resource profile	49	change_resourceprofile
195	Can delete resource profile	49	delete_resourceprofile
196	Can view resource profile	49	view_resourceprofile
197	Can add member capacity	50	add_membercapacity
198	Can change member capacity	50	change_membercapacity
199	Can delete member capacity	50	delete_membercapacity
200	Can view member capacity	50	view_membercapacity
201	Can add time entry	51	add_timeentry
202	Can change time entry	51	change_timeentry
203	Can delete time entry	51	delete_timeentry
204	Can view time entry	51	view_timeentry
\.


--
-- Data for Name: auth_user; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.auth_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined) FROM stdin;
\.


--
-- Data for Name: auth_user_groups; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.auth_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: auth_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.auth_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: cpm_baselines; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.cpm_baselines (id, project_id, name, snapshot, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: cpm_issue_data; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.cpm_issue_data (issue_id, duration_days, es, ef, ls, lf, slack, is_critical, calculated_at) FROM stdin;
\.


--
-- Data for Name: cycle_issues; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.cycle_issues (cycle_id, issue_id, added_at, id) FROM stdin;
d892a4f3-8bcc-48f4-96b5-b2359227633f	6dfb6058-ba8f-44cb-ab23-387bbd3d5519	2026-04-15 16:34:46.384874	397d43c8-82ea-44a4-a25f-9805248c31d7
d892a4f3-8bcc-48f4-96b5-b2359227633f	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	2026-04-17 13:46:55.079274	0e160716-d7c5-497b-9db4-cfff249c18af
d892a4f3-8bcc-48f4-96b5-b2359227633f	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	2026-04-17 13:48:13.469724	a85b7a36-1c6f-4d5b-98f7-40f2ab83bcf3
\.


--
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.cycles (id, project_id, name, description, start_date, end_date, status, created_by, created_at, updated_at) FROM stdin;
d892a4f3-8bcc-48f4-96b5-b2359227633f	b79835b4-96ca-4f90-a88e-c2a896b82f93	Sprint 1	\N	2026-04-13	2026-04-20	draft	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-13 19:49:24.809737	2026-04-13 19:49:24.809749
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
\.


--
-- Data for Name: django_celery_beat_clockedschedule; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_beat_clockedschedule (id, clocked_time) FROM stdin;
\.


--
-- Data for Name: django_celery_beat_crontabschedule; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_beat_crontabschedule (id, minute, hour, day_of_week, day_of_month, month_of_year, timezone) FROM stdin;
1	0	4	*	*	*	America/Sao_Paulo
\.


--
-- Data for Name: django_celery_beat_intervalschedule; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_beat_intervalschedule (id, every, period) FROM stdin;
1	3600	seconds
\.


--
-- Data for Name: django_celery_beat_periodictask; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_beat_periodictask (id, name, task, args, kwargs, queue, exchange, routing_key, expires, enabled, last_run_at, total_run_count, date_changed, description, crontab_id, interval_id, solar_id, one_off, start_time, priority, headers, clocked_id, expire_seconds) FROM stdin;
1	celery.backend_cleanup	celery.backend_cleanup	[]	{}	\N	\N	\N	\N	t	2026-04-23 07:00:00.000705+00	19	2026-04-23 15:56:50.933646+00		1	\N	\N	f	\N	\N	{}	\N	43200
2	refresh-portfolio-rag-hourly	apps.portfolio.tasks.refresh_all_portfolio_rag	[]	{}	\N	\N	\N	\N	t	2026-04-23 15:56:50.954197+00	331	2026-04-23 15:56:50.971335+00		\N	1	\N	f	\N	\N	{}	\N	\N
\.


--
-- Data for Name: django_celery_beat_periodictasks; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_beat_periodictasks (ident, last_update) FROM stdin;
1	2026-04-23 15:56:50.946332+00
\.


--
-- Data for Name: django_celery_beat_solarschedule; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_beat_solarschedule (id, event, latitude, longitude) FROM stdin;
\.


--
-- Data for Name: django_celery_results_chordcounter; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_results_chordcounter (id, group_id, sub_tasks, count) FROM stdin;
\.


--
-- Data for Name: django_celery_results_groupresult; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_results_groupresult (id, group_id, date_created, date_done, content_type, content_encoding, result) FROM stdin;
\.


--
-- Data for Name: django_celery_results_taskresult; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_celery_results_taskresult (id, task_id, status, content_type, content_encoding, result, date_done, traceback, meta, task_args, task_kwargs, task_name, worker, date_created, periodic_task_name) FROM stdin;
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	auth	user
5	contenttypes	contenttype
6	sessions	session
7	django_celery_beat	crontabschedule
8	django_celery_beat	intervalschedule
9	django_celery_beat	periodictask
10	django_celery_beat	periodictasks
11	django_celery_beat	solarschedule
12	django_celery_beat	clockedschedule
13	django_celery_results	taskresult
14	django_celery_results	chordcounter
15	django_celery_results	groupresult
16	db	testmodel
17	milestones	milestone
18	risks	risk
19	workspaces	workspace
20	workspaces	workspacemember
21	projects	project
22	projects	label
23	projects	issuestate
24	projects	projectmember
25	issues	issue
26	issues	issueactivity
27	issues	issueattachment
28	issues	issuecomment
29	issues	issuelabel
30	issues	issuerelation
31	cycles	cycle
32	cycles	cycleissue
33	modules	module
34	modules	moduleissue
35	wiki	wikipage
36	wiki	wikipagecomment
37	wiki	wikipageversion
38	wiki	wikispace
39	wiki	wikiissuelink
40	notifications	notification
41	cpm	cpmissuedata
42	cpm	cpmbaseline
43	portfolio	portfolio
44	portfolio	portfolioobjective
45	portfolio	portfolioproject
46	portfolio	portfoliocostentry
47	portfolio	portfolioprojectdep
48	portfolio	objectiveproject
49	resources	resourceprofile
50	resources	membercapacity
51	resources	timeentry
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-03-05 17:00:15.618535+00
2	auth	0001_initial	2026-03-05 17:00:15.726588+00
3	admin	0001_initial	2026-03-05 17:00:15.75383+00
4	admin	0002_logentry_remove_auto_add	2026-03-05 17:00:15.759734+00
5	admin	0003_logentry_add_action_flag_choices	2026-03-05 17:00:15.76547+00
6	contenttypes	0002_remove_content_type_name	2026-03-05 17:00:15.776837+00
7	auth	0002_alter_permission_name_max_length	2026-03-05 17:00:15.783497+00
8	auth	0003_alter_user_email_max_length	2026-03-05 17:00:15.789574+00
9	auth	0004_alter_user_username_opts	2026-03-05 17:00:15.795772+00
10	auth	0005_alter_user_last_login_null	2026-03-05 17:00:15.802249+00
11	auth	0006_require_contenttypes_0002	2026-03-05 17:00:15.804322+00
12	auth	0007_alter_validators_add_error_messages	2026-03-05 17:00:15.809407+00
13	auth	0008_alter_user_username_max_length	2026-03-05 17:00:15.820764+00
14	auth	0009_alter_user_last_name_max_length	2026-03-05 17:00:15.826274+00
15	auth	0010_alter_group_name_max_length	2026-03-05 17:00:15.833359+00
16	auth	0011_update_proxy_permissions	2026-03-05 17:00:15.841277+00
17	auth	0012_alter_user_first_name_max_length	2026-03-05 17:00:15.848484+00
18	health_check_db	0001_initial	2026-03-05 17:00:15.856772+00
19	django_celery_beat	0001_initial	2026-03-05 17:00:15.909547+00
20	django_celery_beat	0002_auto_20161118_0346	2026-03-05 17:00:15.927396+00
21	django_celery_beat	0003_auto_20161209_0049	2026-03-05 17:00:15.939445+00
22	django_celery_beat	0004_auto_20170221_0000	2026-03-05 17:00:15.943709+00
23	django_celery_beat	0005_add_solarschedule_events_choices	2026-03-05 17:00:15.977107+00
24	django_celery_beat	0006_auto_20180322_0932	2026-03-05 17:00:16.009571+00
25	django_celery_beat	0007_auto_20180521_0826	2026-03-05 17:00:16.024001+00
26	django_celery_beat	0008_auto_20180914_1922	2026-03-05 17:00:16.051019+00
27	django_celery_beat	0006_auto_20180210_1226	2026-03-05 17:00:16.06792+00
28	django_celery_beat	0006_periodictask_priority	2026-03-05 17:00:16.076259+00
29	django_celery_beat	0009_periodictask_headers	2026-03-05 17:00:16.08477+00
30	django_celery_beat	0010_auto_20190429_0326	2026-03-05 17:00:16.230708+00
31	django_celery_beat	0011_auto_20190508_0153	2026-03-05 17:00:16.252219+00
32	django_celery_beat	0012_periodictask_expire_seconds	2026-03-05 17:00:16.260495+00
33	django_celery_beat	0013_auto_20200609_0727	2026-03-05 17:00:16.270442+00
34	django_celery_beat	0014_remove_clockedschedule_enabled	2026-03-05 17:00:16.276151+00
35	django_celery_beat	0015_edit_solarschedule_events_choices	2026-03-05 17:00:16.279666+00
36	django_celery_beat	0016_alter_crontabschedule_timezone	2026-03-05 17:00:16.289827+00
37	django_celery_beat	0017_alter_crontabschedule_month_of_year	2026-03-05 17:00:16.298023+00
38	django_celery_beat	0018_improve_crontab_helptext	2026-03-05 17:00:16.305278+00
39	django_celery_beat	0019_alter_periodictasks_options	2026-03-05 17:00:16.307934+00
40	django_celery_results	0001_initial	2026-03-05 17:00:16.331699+00
41	django_celery_results	0002_add_task_name_args_kwargs	2026-03-05 17:00:16.337393+00
42	django_celery_results	0003_auto_20181106_1101	2026-03-05 17:00:16.340209+00
43	django_celery_results	0004_auto_20190516_0412	2026-03-05 17:00:16.373076+00
44	django_celery_results	0005_taskresult_worker	2026-03-05 17:00:16.387747+00
45	django_celery_results	0006_taskresult_date_created	2026-03-05 17:00:16.407722+00
46	django_celery_results	0007_remove_taskresult_hidden	2026-03-05 17:00:16.411791+00
47	django_celery_results	0008_chordcounter	2026-03-05 17:00:16.432256+00
48	django_celery_results	0009_groupresult	2026-03-05 17:00:16.517183+00
49	django_celery_results	0010_remove_duplicate_indices	2026-03-05 17:00:16.522691+00
50	django_celery_results	0011_taskresult_periodic_task_name	2026-03-05 17:00:16.526266+00
51	sessions	0001_initial	2026-03-05 17:00:16.546547+00
52	db	0001_initial	2026-03-05 17:00:16.550478+00
53	workspaces	0001_initial	2026-04-10 16:53:45.814273+00
54	projects	0001_initial	2026-04-10 16:53:45.834536+00
55	milestones	0001_initial	2026-04-10 16:53:45.845144+00
56	issues	0001_initial	2026-04-10 16:53:45.903226+00
57	cpm	0001_initial	2026-04-10 16:53:45.924457+00
58	cycles	0001_initial	2026-04-10 16:53:45.953689+00
59	issues	0002_create_next_sequence_id_function	2026-04-10 16:53:45.966487+00
60	issues	0003_add_issue_color	2026-04-10 16:53:45.986657+00
61	modules	0001_initial	2026-04-10 16:53:46.015248+00
62	notifications	0001_initial	2026-04-10 16:53:46.033494+00
63	portfolio	0001_initial	2026-04-10 16:53:46.127207+00
64	risks	0001_initial	2026-04-10 16:53:46.150311+00
65	wiki	0001_initial	2026-04-10 16:53:46.317669+00
66	wiki	0002_add_yjs_state	2026-04-10 16:53:46.352744+00
67	wiki	0003_migrate_content_to_yjs_state	2026-04-10 16:53:46.432819+00
68	workspaces	0002_alter_workspacemember_keycloak_sub_and_more	2026-04-10 16:53:46.494264+00
69	resources	0001_initial	2026-04-14 21:14:59.522564+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
\.


--
-- Data for Name: health_check_db_testmodel; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.health_check_db_testmodel (id, title) FROM stdin;
\.


--
-- Data for Name: issue_activities; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issue_activities (id, issue_id, actor_id, activity_type, field, old_value, new_value, old_identifier, new_identifier, created_at) FROM stdin;
4fbe59f1-6608-41e0-9e0a-7ae277664c44	7e95c8d7-8c37-4375-888d-ff54d3c25aef	ba2c773b-1496-4b28-bf71-ee62f22df1f7	created	\N	\N	\N	\N	\N	2026-03-11 16:31:44.828588
be2984aa-f481-42ad-b6a0-0b34f3474e00	7e95c8d7-8c37-4375-888d-ff54d3c25aef	ba2c773b-1496-4b28-bf71-ee62f22df1f7	assigned	assignee_id	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	admin local	2026-03-11 16:32:43.889461
b9c1b0b7-3cfb-48ae-90c7-936e4494a482	7e95c8d7-8c37-4375-888d-ff54d3c25aef	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_priority	priority	none	high	\N	\N	2026-03-11 16:32:43.889476
4298630c-e124-4af9-ae7e-74b04e5acd2e	3c9537be-0710-4f36-8013-a870fdb1c622	ba2c773b-1496-4b28-bf71-ee62f22df1f7	created	\N	\N	\N	\N	\N	2026-03-12 21:01:50.237057
c81503f7-142e-4e6a-8d37-db34d88c5fd7	3c9537be-0710-4f36-8013-a870fdb1c622	ba2c773b-1496-4b28-bf71-ee62f22df1f7	assigned	assignee_id	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	admin local	2026-03-12 21:07:54.260844
30a8adc7-c5f0-4cf9-889f-f8c2e9a17086	3c9537be-0710-4f36-8013-a870fdb1c622	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_priority	priority	none	medium	\N	\N	2026-03-12 21:07:54.260862
43683783-e81a-4b1f-a486-b9fa7940ea54	69e4b69c-7da5-4778-aa8b-b97444952a24	ba2c773b-1496-4b28-bf71-ee62f22df1f7	created	\N	\N	\N	\N	\N	2026-04-06 16:14:03.910571
dd65c7a2-d2d7-4436-b4d6-7b90aafda8f9	69e4b69c-7da5-4778-aa8b-b97444952a24	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	b4dcf8fc-fa93-4974-a319-e2f31e89c8c7	4e9745cc-30f6-4344-884b-a1934c6084ed	Backlog	A Fazer	2026-04-06 16:14:06.228082
17692a11-aa0d-4322-b7e8-bf63b5229a32	69e4b69c-7da5-4778-aa8b-b97444952a24	ba2c773b-1496-4b28-bf71-ee62f22df1f7	assigned	assignee_id	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	admin local	2026-04-06 17:02:08.711418
932753ec-e0c5-4c18-985a-9efa26f7be39	69e4b69c-7da5-4778-aa8b-b97444952a24	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_priority	priority	none	high	\N	\N	2026-04-06 17:02:08.711434
a6744dcc-cc17-4adf-9541-d4f070d3014d	69e4b69c-7da5-4778-aa8b-b97444952a24	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_title	title	sdsdsddsdsd	tarefa 2	\N	\N	2026-04-06 17:02:08.711443
c3fd2a7a-adbe-454f-abdd-75bedafa7478	6dfb6058-ba8f-44cb-ab23-387bbd3d5519	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-06 20:18:20.020238
65c765af-65b4-4d3c-88d7-615cefaee46a	6dfb6058-ba8f-44cb-ab23-387bbd3d5519	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_state	state_id	276c5099-8b68-447a-ae7f-86c0da08a29a	70538d05-b53f-464b-a85a-33d1c8663ec7	Backlog	A fazer	2026-04-08 14:39:49.514354
cf04c291-6abe-4a6a-8a79-36ea177e8c12	6dfb6058-ba8f-44cb-ab23-387bbd3d5519	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_state	state_id	70538d05-b53f-464b-a85a-33d1c8663ec7	14f41ef2-be91-4030-9981-df306472bf99	A fazer	Em andamento	2026-04-08 14:39:58.670629
f8d485b6-7603-44f9-8892-ef8441d8c71e	6dfb6058-ba8f-44cb-ab23-387bbd3d5519	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_state	state_id	14f41ef2-be91-4030-9981-df306472bf99	70538d05-b53f-464b-a85a-33d1c8663ec7	Em andamento	A fazer	2026-04-08 14:40:03.608158
f03f5a7b-c1bb-41c7-a905-d70ff5edb12c	8161dd86-ac88-4223-a483-ef68f3ad5a70	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-08 14:40:40.316852
8d28688b-baad-49d9-888a-638d22da4995	ea6e012f-4584-4112-98c6-dc6afefd324b	ba2c773b-1496-4b28-bf71-ee62f22df1f7	created	\N	\N	\N	\N	\N	2026-04-09 17:04:56.131121
6ad2ad42-32e2-427c-bf15-4e1557c9d8b9	ea6e012f-4584-4112-98c6-dc6afefd324b	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	b4dcf8fc-fa93-4974-a319-e2f31e89c8c7	4e9745cc-30f6-4344-884b-a1934c6084ed	Backlog	A Fazer	2026-04-09 17:05:00.059459
e4ea7617-30c1-4e69-aabe-e740257754e0	ea6e012f-4584-4112-98c6-dc6afefd324b	ba2c773b-1496-4b28-bf71-ee62f22df1f7	assigned	assignee_id	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	admin local	2026-04-09 17:05:28.61586
7848f991-192a-4cbc-8893-bebb309d3986	ea6e012f-4584-4112-98c6-dc6afefd324b	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_priority	priority	none	medium	\N	\N	2026-04-09 17:05:28.615881
a12dc3a3-e443-4ea1-8392-1502fe56c50b	e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-13 14:15:05.20842
c727a1c2-16ae-4e06-bf09-a7e332e629e0	8d2c3e70-e25d-4d36-807b-a9b7d090b9ec	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-13 19:08:10.475389
15f240db-16a2-4794-82b8-fd9148b02404	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-13 19:14:13.312269
ccd6bdbc-9775-42aa-b1bb-ead362a04618	7cac112c-5b3e-44ed-ac52-d1f67401eac6	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-13 19:22:07.920243
0be5c645-7bb2-463c-8c37-cfd6b857e834	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	59a8095d-e7b3-4bae-bd85-695230ae4bfc	created	\N	\N	\N	\N	\N	2026-04-13 19:30:54.942198
d6ca9972-dfff-4352-a339-4fb747711ad9	e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_state	state_id	276c5099-8b68-447a-ae7f-86c0da08a29a	70538d05-b53f-464b-a85a-33d1c8663ec7	Backlog	A fazer	2026-04-13 19:35:00.027213
0fc52f83-cb9a-458d-856d-ac6f3c220f02	e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_priority	priority	medium	none	\N	\N	2026-04-13 19:35:00.027234
7033e4cc-d703-4caf-8a7f-ea563e7a5366	8d2c3e70-e25d-4d36-807b-a9b7d090b9ec	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_title	title	xxxxxxxxxxxxxxxx	Epico 2	\N	\N	2026-04-13 19:35:44.128812
11885ad8-f1b2-454a-84cd-d92e7a9649f1	7cac112c-5b3e-44ed-ac52-d1f67401eac6	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_priority	priority	none	high	\N	\N	2026-04-13 19:36:16.294179
85433203-39de-4612-b60a-3af2024d497d	7cac112c-5b3e-44ed-ac52-d1f67401eac6	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_title	title	vvvvvvvvvvvvvvvvvvvv	Epico 3	\N	\N	2026-04-13 19:36:16.294197
ea3b70de-242b-4059-895e-cb6ec7227e27	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	59a8095d-e7b3-4bae-bd85-695230ae4bfc	updated_state	state_id	276c5099-8b68-447a-ae7f-86c0da08a29a	14f41ef2-be91-4030-9981-df306472bf99	Backlog	Em andamento	2026-04-14 15:13:57.199084
d4c81e66-58e4-4d53-ac9c-241d2049d725	ea6e012f-4584-4112-98c6-dc6afefd324b	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	4e9745cc-30f6-4344-884b-a1934c6084ed	9d7deb4e-6a04-4e4c-b5b7-f208b6cf626e	A Fazer	Em Progresso	2026-04-16 18:48:11.540684
37b24cac-5a83-42b8-8177-b568d124ccb6	69e4b69c-7da5-4778-aa8b-b97444952a24	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	4e9745cc-30f6-4344-884b-a1934c6084ed	b4dcf8fc-fa93-4974-a319-e2f31e89c8c7	A Fazer	Backlog	2026-04-16 18:48:14.42689
f5a143a7-a3a2-4776-9f20-e5d9bf76c353	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	276c5099-8b68-447a-ae7f-86c0da08a29a	70538d05-b53f-464b-a85a-33d1c8663ec7	Backlog	A fazer	2026-04-17 12:06:52.123701
59f989a8-a8b4-4d5b-a287-f380e16cb442	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	14f41ef2-be91-4030-9981-df306472bf99	276c5099-8b68-447a-ae7f-86c0da08a29a	Em andamento	Backlog	2026-04-17 12:07:03.210743
e9d18aa6-9a99-4a1a-ae70-f5e65fb99677	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	70538d05-b53f-464b-a85a-33d1c8663ec7	5c7b3844-9320-41df-b2b0-05afc0b724ed	A fazer	Em revisão	2026-04-17 13:46:55.002761
48dee722-c8ea-47cc-a274-3d47ad75491a	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	ba2c773b-1496-4b28-bf71-ee62f22df1f7	assigned	assignee_id	\N	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	Roberto Geiss	2026-04-17 13:46:55.00278
de9cb763-f207-484f-a4af-ba30f4183b0e	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_priority	priority	none	medium	\N	\N	2026-04-17 13:46:55.002791
63dfa97c-afad-431c-bff9-b9b9bd0163c8	e861ee5f-0286-49c6-b89f-2c6e3d7444c2	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_title	title	2	Criar templates na wiki	\N	\N	2026-04-17 13:46:55.0028
6c61774d-c4c0-40dd-a60d-c81390f67cc7	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	276c5099-8b68-447a-ae7f-86c0da08a29a	70538d05-b53f-464b-a85a-33d1c8663ec7	Backlog	A fazer	2026-04-17 13:48:13.413833
7ce3f91c-570c-402a-86bb-b3ff912a8dce	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	ba2c773b-1496-4b28-bf71-ee62f22df1f7	assigned	assignee_id	\N	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	Roberto Geiss	2026-04-17 13:48:13.413851
e1b53242-164e-4de4-b453-ff869ab46103	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_priority	priority	none	high	\N	\N	2026-04-17 13:48:13.413861
c31b5831-d474-4297-8d7e-481c2eafbd22	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_title	title	1	Permitir link de wiki na descrição	\N	\N	2026-04-17 13:48:13.41387
3b3bc51d-797a-453c-b749-e5239a893eac	a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	ba2c773b-1496-4b28-bf71-ee62f22df1f7	updated_state	state_id	70538d05-b53f-464b-a85a-33d1c8663ec7	14f41ef2-be91-4030-9981-df306472bf99	A fazer	Em andamento	2026-04-17 13:51:35.084927
\.


--
-- Data for Name: issue_attachments; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issue_attachments (id, issue_id, uploaded_by, file_name, file_size, mime_type, storage_path, created_at) FROM stdin;
\.


--
-- Data for Name: issue_comments; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issue_comments (id, issue_id, author_id, content, is_edited, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: issue_labels; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issue_labels (issue_id, label_id) FROM stdin;
3c9537be-0710-4f36-8013-a870fdb1c622	b312f886-cd62-4538-90ef-6e123acae45e
ea6e012f-4584-4112-98c6-dc6afefd324b	25399cbd-b88d-42f4-8666-f08bdbc3394b
ea6e012f-4584-4112-98c6-dc6afefd324b	c635da33-7207-4d3d-b434-bb81a20b3353
ea6e012f-4584-4112-98c6-dc6afefd324b	b312f886-cd62-4538-90ef-6e123acae45e
\.


--
-- Data for Name: issue_relations; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issue_relations (id, issue_id, related_id, relation_type, lag_days, created_at) FROM stdin;
\.


--
-- Data for Name: issue_states; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issue_states (id, project_id, name, color, category, "position", is_default, created_at) FROM stdin;
b4dcf8fc-fa93-4974-a319-e2f31e89c8c7	8c45df6a-a33f-4e9e-a531-135886e773a5	Backlog	#6B7280	backlog	1	f	2026-03-04 19:35:19.821499
9d7deb4e-6a04-4e4c-b5b7-f208b6cf626e	8c45df6a-a33f-4e9e-a531-135886e773a5	Em Progresso	#F59E0B	started	3	f	2026-03-04 19:35:19.821499
4d510c2e-976a-48df-8774-58b8bdb9d486	8c45df6a-a33f-4e9e-a531-135886e773a5	Em Revisão	#8B5CF6	started	4	f	2026-03-04 19:35:19.821499
aa98dfd3-d78e-4a47-b9d4-e1ccc518bca7	8c45df6a-a33f-4e9e-a531-135886e773a5	Concluído	#10B981	completed	5	f	2026-03-04 19:35:19.821499
c81e716e-676c-412d-9fef-f099171e9053	8c45df6a-a33f-4e9e-a531-135886e773a5	Cancelado	#EF4444	cancelled	6	f	2026-03-04 19:35:19.821499
18ba05b1-191b-4917-8a90-a00a0cf8264e	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Backlog	#6B7280	backlog	0	f	2026-03-10 12:00:22.59597
37814a47-b6f8-4c67-a268-5aaaa43ef5f6	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	A fazer	#3B82F6	unstarted	1	t	2026-03-10 12:00:22.595993
5ed03d81-b622-48e6-a7cb-2b2e1650645b	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Em andamento	#F59E0B	started	2	f	2026-03-10 12:00:22.596005
8a9f6b01-38bd-4d87-9565-548e22b9ce13	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Em revisão	#8B5CF6	started	3	f	2026-03-10 12:00:22.596013
ba35fd1f-7276-4eb8-a7d8-a450a460f647	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Concluído	#10B981	completed	4	f	2026-03-10 12:00:22.596022
887edf05-51a5-4fa1-a5f0-479d147a260c	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Cancelado	#EF4444	cancelled	5	f	2026-03-10 12:00:22.59603
276c5099-8b68-447a-ae7f-86c0da08a29a	b79835b4-96ca-4f90-a88e-c2a896b82f93	Backlog	#6B7280	backlog	0	f	2026-04-06 19:43:07.06492
70538d05-b53f-464b-a85a-33d1c8663ec7	b79835b4-96ca-4f90-a88e-c2a896b82f93	A fazer	#3B82F6	unstarted	1	t	2026-04-06 19:43:07.064934
14f41ef2-be91-4030-9981-df306472bf99	b79835b4-96ca-4f90-a88e-c2a896b82f93	Em andamento	#F59E0B	started	2	f	2026-04-06 19:43:07.064943
5c7b3844-9320-41df-b2b0-05afc0b724ed	b79835b4-96ca-4f90-a88e-c2a896b82f93	Em revisão	#8B5CF6	started	3	f	2026-04-06 19:43:07.064951
b61382d4-2c75-4b99-885f-07bd46e68862	b79835b4-96ca-4f90-a88e-c2a896b82f93	Concluído	#10B981	completed	4	f	2026-04-06 19:43:07.064959
662f5c16-0e4b-4ea1-8382-5f7cf7153edf	b79835b4-96ca-4f90-a88e-c2a896b82f93	Cancelado	#EF4444	cancelled	5	f	2026-04-06 19:43:07.064968
4e9745cc-30f6-4344-884b-a1934c6084ed	8c45df6a-a33f-4e9e-a531-135886e773a5	A Fazer	#3B82F6	unstarted	-999	t	2026-03-04 22:35:19.821499
\.


--
-- Data for Name: issues; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.issues (id, project_id, sequence_id, title, description, state_id, priority, type, assignee_id, reporter_id, parent_id, epic_id, estimate_points, due_date, start_date, started_at, completed_at, sort_order, created_at, updated_at, created_by, size, estimate_days, milestone_id, color) FROM stdin;
7e95c8d7-8c37-4375-888d-ff54d3c25aef	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	1	Teste 01	"Teste de edição de task"	18ba05b1-191b-4917-8a90-a00a0cf8264e	high	task	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	\N	\N	\N	\N	\N	\N	65535	2026-03-11 19:31:44.824644	2026-03-11 16:32:43.885122	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	\N	\N	\N
3c9537be-0710-4f36-8013-a870fdb1c622	8c45df6a-a33f-4e9e-a531-135886e773a5	1	Projeto 01	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Teste de funcionalidade", "type": "text"}]}]}	b4dcf8fc-fa93-4974-a319-e2f31e89c8c7	medium	task	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	\N	\N	\N	\N	\N	\N	65535	2026-03-13 18:01:50.226245	2026-04-08 19:23:22.060271	ba2c773b-1496-4b28-bf71-ee62f22df1f7	xs	1	\N	\N
e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	b79835b4-96ca-4f90-a88e-c2a896b82f93	3	Epico 1	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Primeiro épico", "type": "text"}]}]}	70538d05-b53f-464b-a85a-33d1c8663ec7	none	epic	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	\N	\N	\N	\N	\N	\N	65535	2026-04-13 17:15:05.202868	2026-04-13 19:35:00.019301	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	\N	\N	#f97316
8d2c3e70-e25d-4d36-807b-a9b7d090b9ec	b79835b4-96ca-4f90-a88e-c2a896b82f93	10	Epico 2	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Segundo epico", "type": "text"}]}]}	276c5099-8b68-447a-ae7f-86c0da08a29a	none	epic	\N	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	\N	\N	\N	\N	\N	\N	65535	2026-04-13 22:08:10.470006	2026-04-13 19:35:44.125214	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	\N	\N	#ec4899
7cac112c-5b3e-44ed-ac52-d1f67401eac6	b79835b4-96ca-4f90-a88e-c2a896b82f93	12	Epico 3	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Terceiro epico", "type": "text"}]}]}	276c5099-8b68-447a-ae7f-86c0da08a29a	high	epic	\N	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	\N	\N	\N	\N	\N	\N	65535	2026-04-13 22:22:07.914789	2026-04-13 19:36:16.290174	59a8095d-e7b3-4bae-bd85-695230ae4bfc	xs	\N	\N	#ef4444
8161dd86-ac88-4223-a483-ef68f3ad5a70	b79835b4-96ca-4f90-a88e-c2a896b82f93	2	Tarefa 02	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Tarefa 02", "type": "text"}]}]}	276c5099-8b68-447a-ae7f-86c0da08a29a	medium	task	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	\N	\N	\N	\N	\N	65535	2026-04-08 20:40:40.312828	2026-04-13 19:47:30.979711	59a8095d-e7b3-4bae-bd85-695230ae4bfc	s	1	\N	\N
6dfb6058-ba8f-44cb-ab23-387bbd3d5519	b79835b4-96ca-4f90-a88e-c2a896b82f93	1	Tarefa 01	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Tarefa 01", "type": "text"}]}]}	70538d05-b53f-464b-a85a-33d1c8663ec7	urgent	task	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	\N	\N	\N	\N	\N	65535	2026-04-07 14:18:20.015069	2026-04-15 16:35:04.22616	59a8095d-e7b3-4bae-bd85-695230ae4bfc	s	\N	\N	\N
e861ee5f-0286-49c6-b89f-2c6e3d7444c2	b79835b4-96ca-4f90-a88e-c2a896b82f93	13	Criar templates na wiki	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Criar templates na wiki com tipos pré-definidos.", "type": "text"}]}]}	5c7b3844-9320-41df-b2b0-05afc0b724ed	medium	task	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	8d2c3e70-e25d-4d36-807b-a9b7d090b9ec	\N	\N	\N	\N	\N	65535	2026-04-14 04:30:54.938929	2026-04-17 13:46:54.993582	59a8095d-e7b3-4bae-bd85-695230ae4bfc	s	1	\N	\N
a1dd6c99-74ab-4c6b-ac07-f4e5e4e16b69	b79835b4-96ca-4f90-a88e-c2a896b82f93	11	Permitir link de wiki na descrição	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Permitir link de wiki na descrição", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Zanzibar", "type": "text", "marks": [{"type": "link", "attrs": {"rel": "noopener noreferrer nofollow", "href": "/projects/b79835b4-96ca-4f90-a88e-c2a896b82f93/wiki/8cdc68db-7885-442b-83ce-89c01eec1564", "class": null, "target": "_blank"}}]}, {"text": " ", "type": "text"}]}]}	14f41ef2-be91-4030-9981-df306472bf99	high	task	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	\N	e15c0ecb-f5d7-43ca-a8d4-96c19ca47b37	\N	\N	\N	\N	\N	65535	2026-04-14 19:14:13.308579	2026-04-17 18:38:49.908852	59a8095d-e7b3-4bae-bd85-695230ae4bfc	m	1	\N	\N
ea6e012f-4584-4112-98c6-dc6afefd324b	8c45df6a-a33f-4e9e-a531-135886e773a5	3	Gerar o status report financeiro	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Gerar o status report financeiro ", "type": "text"}, {"text": "Nova página", "type": "text", "marks": [{"type": "link", "attrs": {"rel": "noopener noreferrer nofollow", "href": "/projects/8c45df6a-a33f-4e9e-a531-135886e773a5/wiki/07ee2b04-b339-4ef8-90f4-808af4275094", "class": null, "target": "_blank"}}]}, {"text": " ", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Nova página", "type": "text", "marks": [{"type": "link", "attrs": {"rel": "noopener noreferrer nofollow", "href": "/projects/8c45df6a-a33f-4e9e-a531-135886e773a5/wiki/1ccd5b6e-0e8e-4a49-b94a-70ada76d5272", "class": null, "target": "_blank"}}]}, {"text": " ", "type": "text"}]}]}	9d7deb4e-6a04-4e4c-b5b7-f208b6cf626e	medium	task	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	\N	\N	\N	\N	\N	\N	65535	2026-04-10 08:04:56.122569	2026-04-23 12:19:34.06803	ba2c773b-1496-4b28-bf71-ee62f22df1f7	m	1	\N	\N
69e4b69c-7da5-4778-aa8b-b97444952a24	8c45df6a-a33f-4e9e-a531-135886e773a5	2	tarefa 2	{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1}, "content": [{"text": "Tarefa 2", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Nova página", "type": "text", "marks": [{"type": "link", "attrs": {"rel": "noopener noreferrer nofollow", "href": "/projects/8c45df6a-a33f-4e9e-a531-135886e773a5/wiki/d7937be0-fdb8-4a5f-8c69-0376ef809a1a", "class": null, "target": "_blank"}}]}, {"text": " ", "type": "text"}]}, {"type": "heading", "attrs": {"level": 1}}]}	b4dcf8fc-fa93-4974-a319-e2f31e89c8c7	high	task	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	\N	\N	\N	\N	\N	\N	\N	65535	2026-04-07 07:14:03.902616	2026-04-23 12:22:15.665442	ba2c773b-1496-4b28-bf71-ee62f22df1f7	xs	3	\N	\N
\.


--
-- Data for Name: labels; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.labels (id, project_id, name, color, created_at) FROM stdin;
cc03338b-9c22-4218-b278-327b216efbcd	8c45df6a-a33f-4e9e-a531-135886e773a5	bug	#EF4444	2026-03-04 19:35:19.821499
c635da33-7207-4d3d-b434-bb81a20b3353	8c45df6a-a33f-4e9e-a531-135886e773a5	funcionalidade	#3B82F6	2026-03-04 19:35:19.821499
b312f886-cd62-4538-90ef-6e123acae45e	8c45df6a-a33f-4e9e-a531-135886e773a5	melhoria	#10B981	2026-03-04 19:35:19.821499
25399cbd-b88d-42f4-8666-f08bdbc3394b	8c45df6a-a33f-4e9e-a531-135886e773a5	documentação	#F59E0B	2026-03-04 19:35:19.821499
517ca3f1-1844-4b94-a985-ca6f9aad220f	8c45df6a-a33f-4e9e-a531-135886e773a5	urgente	#DC2626	2026-03-04 19:35:19.821499
b0f5dc0e-4b33-4b07-88b1-cf497ef757a4	8c45df6a-a33f-4e9e-a531-135886e773a5	bug critico	#ec4899	2026-04-16 21:51:58.733206
\.


--
-- Data for Name: member_capacities; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.member_capacities (id, year, month, available_days, note, member_id) FROM stdin;
c9454d53-e196-4388-b10a-5d097576c6b1	2026	4	5.0	\N	59a8095d-e7b3-4bae-bd85-695230ae4bfc
d869cdd1-9554-421d-806d-fadd1fe41f76	2026	4	2.0	\N	9ac5d13f-d55a-4531-959c-bc4124994f18
cbb45759-cf2c-4c6a-b0c1-3d18be25ad85	2026	4	3.0	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7
2eec41ca-2423-4614-9b70-4f3fbd954829	2026	4	21.0	\N	3d3c3fca-af78-4edf-8d15-8ef59329dbc5
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.milestones (id, project_id, name, description, due_date, status, created_by, created_at, updated_at) FROM stdin;
3a6f5ac5-1395-4493-89ad-456fb0f3fdb9	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Entrega 1	Primeira entrega	2026-03-25	pending	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-03-11 18:21:36.77265	2026-03-11 18:21:36.772663
\.


--
-- Data for Name: module_issues; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.module_issues (module_id, issue_id, added_at) FROM stdin;
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.modules (id, project_id, name, description, status, lead_id, start_date, target_date, created_by, created_at, updated_at) FROM stdin;
b5b97283-0787-4c22-900a-7cc793038b19	b79835b4-96ca-4f90-a88e-c2a896b82f93	Modulo 1	\N	backlog	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-03-30	2026-06-26	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-13 19:48:39.343292	2026-04-13 19:48:39.343303
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.notifications (id, workspace_id, recipient_id, actor_id, type, title, body, entity_type, entity_id, action_url, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: objective_projects; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.objective_projects (objective_id, project_id, weight, id) FROM stdin;
\.


--
-- Data for Name: portfolio_cost_entries; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.portfolio_cost_entries (id, portfolio_project_id, description, amount, entry_date, category, registered_by, created_at) FROM stdin;
\.


--
-- Data for Name: portfolio_objectives; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.portfolio_objectives (id, portfolio_id, title, description, target_value, current_value, unit, due_date, created_at, updated_at) FROM stdin;
2bd9b8ae-26aa-43fa-b7c8-fe08905700a5	8823eb85-5d62-4cf6-86c8-f3e3859ab488	Desenvolver app Cusco	\N	100.00	7.00	%	2026-03-26	2026-03-13 04:03:15.837075	2026-03-12 20:31:10.08387
351ff800-3794-460a-aee6-083544fa5a08	8823eb85-5d62-4cf6-86c8-f3e3859ab488	zzzzzzzzzzzzz	zzzzzzzzzzz	100.00	4.00	%	2026-03-26	2026-03-12 20:33:47.72271	2026-03-12 20:33:47.722721
19713b77-c3aa-4243-9133-c1825b5bac3e	8823eb85-5d62-4cf6-86c8-f3e3859ab488	Implantar SSO em todos os sistemas internos	Keycloak	100.00	0.00	%	2026-04-10	2026-03-13 10:16:38.231216	2026-03-12 20:58:42.132251
\.


--
-- Data for Name: portfolio_project_deps; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.portfolio_project_deps (id, predecessor_id, successor_id, description, created_at) FROM stdin;
\.


--
-- Data for Name: portfolio_projects; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.portfolio_projects (id, portfolio_id, project_id, start_date, end_date, budget_planned, budget_actual, rag_status, rag_override, rag_note, "position", updated_at) FROM stdin;
ba89c652-61ed-41d6-974b-27f09247bd12	8823eb85-5d62-4cf6-86c8-f3e3859ab488	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	2026-03-13	2026-03-30	100000.00	0.00	RED	f	\N	0	2026-04-06 13:29:42.691758
e4c5ab8c-af57-4a92-bdfe-cd7bb5556285	57fe6514-f6c0-4ad5-acf1-559c3158acd3	8c45df6a-a33f-4e9e-a531-135886e773a5	2026-03-12	2026-03-31	200.00	0.00	RED	f	\N	0	2026-04-06 13:29:42.691764
43d43f0f-2297-4a71-9f10-86b0ab87058e	8823eb85-5d62-4cf6-86c8-f3e3859ab488	8c45df6a-a33f-4e9e-a531-135886e773a5	2026-04-13	2027-03-15	1000.00	0.00	GREEN	f	\N	0	2026-04-08 20:00:49.488917
8a9c92ee-f8f5-41ff-b64a-dedbab3d8281	8823eb85-5d62-4cf6-86c8-f3e3859ab488	b79835b4-96ca-4f90-a88e-c2a896b82f93	2026-04-08	2026-08-14	1000.00	0.00	AMBER	f	\N	0	2026-04-15 16:46:03.317166
\.


--
-- Data for Name: portfolios; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.portfolios (id, workspace_id, name, description, owner_id, created_at, updated_at) FROM stdin;
57fe6514-f6c0-4ad5-acf1-559c3158acd3	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	Portfolio 2	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-03-12 17:04:05.646692	2026-03-12 17:04:05.646718
8823eb85-5d62-4cf6-86c8-f3e3859ab488	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	Portfolio 1	\N	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-03-12 16:11:45.439159	2026-03-12 19:12:12.605712
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.project_members (project_id, member_id, role, joined_at, id, created_at, updated_at) FROM stdin;
8c45df6a-a33f-4e9e-a531-135886e773a5	ba2c773b-1496-4b28-bf71-ee62f22df1f7	admin	2026-03-11 15:50:56.6699	ac7b8118-d41a-4ec2-9668-8041a2f79ab5	2026-03-11 15:50:56.669732	2026-03-11 15:50:56.669749
f1d91791-0ecb-4375-b93b-12c4ba53ecb5	ba2c773b-1496-4b28-bf71-ee62f22df1f7	admin	2026-03-11 15:50:56.673598	282a5105-e419-41aa-a091-d8974fc37bc9	2026-03-11 15:50:56.673477	2026-03-11 15:50:56.673487
b79835b4-96ca-4f90-a88e-c2a896b82f93	59a8095d-e7b3-4bae-bd85-695230ae4bfc	admin	2026-04-06 19:43:07.06212	ce6e2b5e-89d2-4efc-be06-a88ac4bd4375	2026-04-06 19:43:07.061966	2026-04-06 19:43:07.061976
\.


--
-- Data for Name: project_risks; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.project_risks (id, project_id, title, description, category, probability, impact, score, status, response_type, owner_id, mitigation_plan, contingency_plan, due_date, created_by, created_at, updated_at) FROM stdin;
1ad05ad7-4f9c-4412-be14-80b7ffa217c1	8c45df6a-a33f-4e9e-a531-135886e773a5	Falta de recursos	Falta de recursos	technical	3	3	9	identified	avoid	ba2c773b-1496-4b28-bf71-ee62f22df1f7	Falta de recursos	Falta de recursos	2026-05-06	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 16:22:24.880169+00	2026-04-06 16:22:24.880179+00
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.projects (id, workspace_id, name, identifier, description, icon, color, status, is_private, created_by, created_at, updated_at) FROM stdin;
8c45df6a-a33f-4e9e-a531-135886e773a5	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	ProjectHub — Implantação	HUB	Projeto de desenvolvimento e implantação do ProjectHub	🚀	#3B82F6	active	f	\N	2026-03-04 19:35:19.821499	2026-03-04 19:35:19.821499
f1d91791-0ecb-4375-b93b-12c4ba53ecb5	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	Projeto01	P01	\N	\N	\N	active	f	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-03-09 21:23:46.906459	2026-03-09 21:23:46.906472
b79835b4-96ca-4f90-a88e-c2a896b82f93	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	Ginasio 2	GINASI	\N	\N	\N	active	f	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-06 19:43:07.058328	2026-04-06 19:43:07.058387
\.


--
-- Data for Name: resource_profiles; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.resource_profiles (id, daily_rate_brl, created_at, updated_at, member_id, project_id) FROM stdin;
\.


--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.time_entries (id, date, hours, description, created_at, issue_id, member_id) FROM stdin;
\.


--
-- Data for Name: wiki_issue_links; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.wiki_issue_links (page_id, issue_id, link_type, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: wiki_page_comments; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.wiki_page_comments (id, page_id, author_id, content, selection_text, resolved, resolved_by, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wiki_page_versions; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.wiki_page_versions (id, page_id, title, content, version, change_summary, saved_by, created_at, yjs_state) FROM stdin;
\.


--
-- Data for Name: wiki_pages; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.wiki_pages (id, space_id, parent_id, title, content, emoji, cover_url, is_locked, is_archived, is_published, published_token, "position", view_count, word_count, created_by, updated_by, created_at, updated_at, yjs_state) FROM stdin;
72dbf65d-aa77-4145-a37b-543b0dc80ead	d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	\N	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 13:33:01.798418	2026-04-06 13:33:01.798438	\N
651dddf8-823f-47f5-bb7f-02905df66b06	d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	72dbf65d-aa77-4145-a37b-543b0dc80ead	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 13:33:05.669416	2026-04-06 13:33:05.669424	\N
2786f3d2-5086-4673-a1bb-9f8ab71154bb	d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	72dbf65d-aa77-4145-a37b-543b0dc80ead	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 13:33:06.648489	2026-04-06 13:33:06.648498	\N
656274a9-dc1d-441f-acfb-16fcce848d89	d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	72dbf65d-aa77-4145-a37b-543b0dc80ead	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 13:33:07.517818	2026-04-06 13:33:07.517827	\N
95982efb-9770-4028-ad67-291f480c4657	d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	362ca996-adad-41fe-908b-f626bb9ec1a7	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 13:33:10.887709	2026-04-06 13:33:10.887717	\N
d7937be0-fdb8-4a5f-8c69-0376ef809a1a	0e65fc64-317e-4054-b422-ad19f7ce8532	72a22d34-e258-4f10-a061-ceca3ea1e886	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 16:14:32.902192	2026-04-06 16:14:32.902201	\N
1ccd5b6e-0e8e-4a49-b94a-70ada76d5272	0e65fc64-317e-4054-b422-ad19f7ce8532	cc0d3931-9b6d-45d1-8160-53829438a11e	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 16:14:36.35189	2026-04-06 16:14:36.351898	\N
07ee2b04-b339-4ef8-90f4-808af4275094	0e65fc64-317e-4054-b422-ad19f7ce8532	1ccd5b6e-0e8e-4a49-b94a-70ada76d5272	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 18:18:01.147259	2026-04-06 18:18:01.147299	\N
8e72f55a-0911-45e3-b5f4-f1a0da90a75e	803246f8-620e-401f-8464-767f46407783	da684ca9-7a4d-49e9-adf2-b136f6a501fb	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-06 19:43:19.864719	2026-04-06 19:43:19.864728	\N
c0d056fc-e322-4110-a1bc-1d42d5459131	803246f8-620e-401f-8464-767f46407783	8e72f55a-0911-45e3-b5f4-f1a0da90a75e	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-06 19:43:21.001013	2026-04-06 19:43:21.001021	\N
da684ca9-7a4d-49e9-adf2-b136f6a501fb	803246f8-620e-401f-8464-767f46407783	\N	Nova página	{}	\N	\N	f	t	f	\N	65535	0	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-06 19:43:18.35165	2026-04-06 19:55:17.778293	\N
10fbf696-db18-4669-85ea-7edee82fb052	803246f8-620e-401f-8464-767f46407783	\N	Nova página	{}	\N	\N	f	f	f	\N	65535	0	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-06 20:40:20.044129	2026-04-06 20:40:20.044139	\N
362ca996-adad-41fe-908b-f626bb9ec1a7	d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	656274a9-dc1d-441f-acfb-16fcce848d89	Nova página	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "zzz ", "type": "text"}]}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 16:33:09.033993	2026-04-08 14:51:48.930256	\N
72a22d34-e258-4f10-a061-ceca3ea1e886	0e65fc64-317e-4054-b422-ad19f7ce8532	\N	Nova página	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "teste", "type": "text"}]}, {"type": "paragraph"}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-03-12 22:45:44.062833	2026-04-08 14:59:15.952934	\N
cc0d3931-9b6d-45d1-8160-53829438a11e	0e65fc64-317e-4054-b422-ad19f7ce8532	d7937be0-fdb8-4a5f-8c69-0376ef809a1a	Nova página	{"type": "doc", "content": [{"type": "paragraph"}, {"type": "paragraph"}, {"type": "video", "attrs": {"src": "https://www.youtube.com/watch?v=lv0DdVLZuHc"}}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-06 19:14:34.653384	2026-04-08 19:15:30.893111	\N
8cdc68db-7885-442b-83ce-89c01eec1564	803246f8-620e-401f-8464-767f46407783	\N	Zanzibar	{"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Google Zanzibar ", "type": "text", "marks": [{"type": "link", "attrs": {"rel": "noopener noreferrer", "href": "https://en.wikipedia.org/wiki/Google_Zanzibar", "class": null, "target": "_blank"}}]}, {"type": "mention", "attrs": {"id": "59a8095d-e7b3-4bae-bd85-695230ae4bfc", "label": "Roberto Geiss", "mentionSuggestionChar": "@"}}, {"text": " ", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Zanzibar is an authorization system developed by Google for managing access control. It was first described in a research paper presented at the 2019 USENIX Annual Technical Conference. Zanzibar supports authorization for several Google services, including Google Drive, Google Photos, and YouTube. ", "type": "text"}]}, {"type": "panel", "attrs": {"type": "tip"}, "content": [{"type": "paragraph", "content": [{"text": "Dica do dia", "type": "text"}]}]}, {"type": "paragraph"}, {"type": "panel", "attrs": {"type": "success"}, "content": [{"type": "paragraph", "content": [{"text": "ok", "type": "text"}]}]}, {"type": "paragraph"}, {"type": "panel", "attrs": {"type": "info"}, "content": [{"type": "paragraph", "content": [{"text": "info", "type": "text"}]}]}, {"type": "paragraph"}, {"type": "panel", "attrs": {"type": "warning"}, "content": [{"type": "paragraph", "content": [{"text": "Aviso", "type": "text"}]}]}, {"type": "paragraph"}, {"type": "panel", "attrs": {"type": "note"}, "content": [{"type": "paragraph", "content": [{"text": "Painel nota", "type": "text"}]}, {"type": "paragraph"}]}]}	\N	\N	f	f	f	\N	65535	0	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-07 05:18:24.107388	2026-04-07 13:04:21.299905	\N
df939fdb-d1b9-40d5-887d-ddb49ed07f26	803246f8-620e-401f-8464-767f46407783	8cdc68db-7885-442b-83ce-89c01eec1564	Zanzibar 2	{}	\N	\N	f	f	f	\N	65535	0	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-14 19:31:00.043794	2026-04-14 13:31:08.91017	\N
e2918cb5-165c-4f29-865b-5a0e1c5c48b3	803246f8-620e-401f-8464-767f46407783	\N	Reunião —	{"type": "doc", "content": [{"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Participantes", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Pauta", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Notas", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Decisões", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Ações", "type": "text"}]}, {"type": "taskList", "content": [{"type": "taskItem", "attrs": {"checked": false}, "content": [{"type": "paragraph", "content": []}]}]}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-17 13:33:16.271346	2026-04-17 13:33:16.2714	\N
1042ea7e-1e7d-40c9-bc2c-f5d43ccfff5b	803246f8-620e-401f-8464-767f46407783	\N	Runbook —	{"type": "doc", "content": [{"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Objetivo", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Pré-requisitos", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Passos", "type": "text"}]}, {"type": "orderedList", "attrs": {"start": 1}, "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Rollback", "type": "text"}]}, {"type": "orderedList", "attrs": {"start": 1}, "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Troubleshooting", "type": "text"}]}, {"type": "paragraph", "content": []}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-17 13:33:36.99672	2026-04-17 13:33:36.996729	\N
1e6b2663-e52e-4d73-b559-64ea7710e4ff	803246f8-620e-401f-8464-767f46407783	\N	Decisão Técnica —	{"type": "doc", "content": [{"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Status", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Proposto", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Contexto", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Opções consideradas", "type": "text"}]}, {"type": "heading", "attrs": {"id": null, "level": 3}, "content": [{"text": "Opção 1", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 3}, "content": [{"text": "Opção 2", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Decisão", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Consequências", "type": "text"}]}, {"type": "heading", "attrs": {"id": null, "level": 3}, "content": [{"text": "Positivas", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 3}, "content": [{"text": "Negativas / Riscos", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-17 13:33:41.659056	2026-04-17 13:33:41.659065	\N
9567569d-e3bf-419b-984a-4107586e5057	803246f8-620e-401f-8464-767f46407783	\N	Postmortem —	{"type": "doc", "content": [{"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Resumo", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Impacto", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Duração: ", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Usuários afetados: ", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Sistemas afetados: ", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Linha do tempo", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "HH:MM — ", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Causa raiz", "type": "text"}]}, {"type": "paragraph", "content": []}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Fatores contribuintes", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "Ações corretivas", "type": "text"}]}, {"type": "taskList", "content": [{"type": "taskItem", "attrs": {"checked": false}, "content": [{"type": "paragraph", "content": []}]}]}, {"type": "heading", "attrs": {"id": null, "level": 2}, "content": [{"text": "O que funcionou bem", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": []}]}]}]}	\N	\N	f	f	f	\N	65535	0	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-04-17 13:33:47.308611	2026-04-17 13:33:47.308621	\N
\.


--
-- Data for Name: wiki_spaces; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.wiki_spaces (id, workspace_id, project_id, name, description, icon, color, is_private, "position", created_by, created_at, updated_at) FROM stdin;
0e65fc64-317e-4054-b422-ad19f7ce8532	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	8c45df6a-a33f-4e9e-a531-135886e773a5	Documentação TI	Base de conhecimento da Coordenadoria de TI	📚	\N	f	1	\N	2026-03-04 19:35:19.821499	2026-03-04 19:35:19.821499
d751dd0e-61c7-45d6-8e57-3f52c3c79bf8	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	f1d91791-0ecb-4375-b93b-12c4ba53ecb5	Projeto01	\N	\N	\N	f	0	ba2c773b-1496-4b28-bf71-ee62f22df1f7	2026-03-10 16:41:07.416993	2026-03-10 16:41:07.416993
803246f8-620e-401f-8464-767f46407783	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	b79835b4-96ca-4f90-a88e-c2a896b82f93	Ginasio 2	\N	\N	\N	f	0	59a8095d-e7b3-4bae-bd85-695230ae4bfc	2026-04-06 19:43:07.068114	2026-04-06 19:43:07.06812
\.


--
-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.workspace_members (id, workspace_id, keycloak_sub, name, email, avatar_url, role, is_active, last_login_at, joined_at, updated_at) FROM stdin;
ba2c773b-1496-4b28-bf71-ee62f22df1f7	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	d481ca75-1625-450a-89fe-1604b7844b46	admin local	admin@projecthub.local	\N	admin	t	\N	2026-03-09 21:13:54.549088	2026-03-12 16:02:11.969926
3d3c3fca-af78-4edf-8d15-8ef59329dbc5	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	91e0f549-d6c6-4f79-8bdf-15491558489f	Ana Schuch	anacs@novohamburgo.rs.gov.br	\N	member	t	\N	2026-03-11 15:41:58.442375	2026-03-11 15:41:58.442387
9ac5d13f-d55a-4531-959c-bc4124994f18	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	8b60bf40-c45d-4481-b24b-36690db0da20	Anderson Carneiro	anderson@novohamburgo.rs.gov.br	\N	member	t	\N	2026-03-11 15:42:13.102156	2026-03-11 15:42:13.102165
ea0fe711-9b58-45e5-9b62-910f0beb6169	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	b04ef91d-8152-46a2-8a2a-e9628c7d3d94	Roberto Geiss	sistemas@novohamburgo.rs.gov.br	\N	admin	t	\N	2026-03-11 15:41:37.265163	2026-03-12 16:02:04.744397
59a8095d-e7b3-4bae-bd85-695230ae4bfc	07d813d1-88b6-4b5c-ba7b-a4142b3ee743	bfb99526-9e71-420c-8b1a-4a1dbaf64dc1	Roberto Geiss	dev@novohamburgo.rs.gov.br	\N	member	t	\N	2026-04-06 15:47:31.437091	2026-04-06 15:47:31.437101
c563f276-c4d6-4612-9119-a0c8a3415dbd	6b124062-d7a3-4677-a19d-c3d5434593ca	d481ca75-1625-450a-89fe-1604b7844b46	admin local	admin@projecthub.local	\N	admin	t	\N	2026-04-16 15:56:27.422627	2026-04-16 15:56:27.422633
\.


--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: projecthub
--

COPY public.workspaces (id, name, slug, description, logo_url, created_at, updated_at) FROM stdin;
07d813d1-88b6-4b5c-ba7b-a4142b3ee743	Prefeitura de Novo Hamburgo	pnh	Workspace principal — Transformação Digital TI	\N	2026-03-04 19:35:19.821499	2026-03-04 19:35:19.821499
6b124062-d7a3-4677-a19d-c3d5434593ca	IT Crowd	it-crowd	\N	\N	2026-04-16 15:56:27.419383	2026-04-16 15:56:27.419395
\.


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 204, true);


--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.auth_user_groups_id_seq', 1, false);


--
-- Name: auth_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.auth_user_id_seq', 1, false);


--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.auth_user_user_permissions_id_seq', 1, false);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_celery_beat_clockedschedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_beat_clockedschedule_id_seq', 1, false);


--
-- Name: django_celery_beat_crontabschedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_beat_crontabschedule_id_seq', 1, true);


--
-- Name: django_celery_beat_intervalschedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_beat_intervalschedule_id_seq', 1, true);


--
-- Name: django_celery_beat_periodictask_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_beat_periodictask_id_seq', 2, true);


--
-- Name: django_celery_beat_solarschedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_beat_solarschedule_id_seq', 1, false);


--
-- Name: django_celery_results_chordcounter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_results_chordcounter_id_seq', 1, false);


--
-- Name: django_celery_results_groupresult_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_results_groupresult_id_seq', 1, false);


--
-- Name: django_celery_results_taskresult_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_celery_results_taskresult_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 51, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 69, true);


--
-- Name: health_check_db_testmodel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: projecthub
--

SELECT pg_catalog.setval('public.health_check_db_testmodel_id_seq', 41091, true);


--
-- Name: username_login_failure CONSTRAINT_17-2; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.username_login_failure
    ADD CONSTRAINT "CONSTRAINT_17-2" PRIMARY KEY (realm_id, username);


--
-- Name: keycloak_role UK_J3RWUVD56ONTGSUHOGM184WW2-2; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT "UK_J3RWUVD56ONTGSUHOGM184WW2-2" UNIQUE (name, client_realm_constraint);


--
-- Name: client_auth_flow_bindings c_cli_flow_bind; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_auth_flow_bindings
    ADD CONSTRAINT c_cli_flow_bind PRIMARY KEY (client_id, binding_name);


--
-- Name: client_scope_client c_cli_scope_bind; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope_client
    ADD CONSTRAINT c_cli_scope_bind PRIMARY KEY (client_id, scope_id);


--
-- Name: client_initial_access cnstr_client_init_acc_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_initial_access
    ADD CONSTRAINT cnstr_client_init_acc_pk PRIMARY KEY (id);


--
-- Name: realm_default_groups con_group_id_def_groups; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT con_group_id_def_groups UNIQUE (group_id);


--
-- Name: broker_link constr_broker_link_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.broker_link
    ADD CONSTRAINT constr_broker_link_pk PRIMARY KEY (identity_provider, user_id);


--
-- Name: client_user_session_note constr_cl_usr_ses_note; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_user_session_note
    ADD CONSTRAINT constr_cl_usr_ses_note PRIMARY KEY (client_session, name);


--
-- Name: component_config constr_component_config_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.component_config
    ADD CONSTRAINT constr_component_config_pk PRIMARY KEY (id);


--
-- Name: component constr_component_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.component
    ADD CONSTRAINT constr_component_pk PRIMARY KEY (id);


--
-- Name: fed_user_required_action constr_fed_required_action; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_required_action
    ADD CONSTRAINT constr_fed_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: fed_user_attribute constr_fed_user_attr_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_attribute
    ADD CONSTRAINT constr_fed_user_attr_pk PRIMARY KEY (id);


--
-- Name: fed_user_consent constr_fed_user_consent_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_consent
    ADD CONSTRAINT constr_fed_user_consent_pk PRIMARY KEY (id);


--
-- Name: fed_user_credential constr_fed_user_cred_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_credential
    ADD CONSTRAINT constr_fed_user_cred_pk PRIMARY KEY (id);


--
-- Name: fed_user_group_membership constr_fed_user_group; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_group_membership
    ADD CONSTRAINT constr_fed_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: fed_user_role_mapping constr_fed_user_role; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_role_mapping
    ADD CONSTRAINT constr_fed_user_role PRIMARY KEY (role_id, user_id);


--
-- Name: federated_user constr_federated_user; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.federated_user
    ADD CONSTRAINT constr_federated_user PRIMARY KEY (id);


--
-- Name: realm_default_groups constr_realm_default_groups; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT constr_realm_default_groups PRIMARY KEY (realm_id, group_id);


--
-- Name: realm_enabled_event_types constr_realm_enabl_event_types; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_enabled_event_types
    ADD CONSTRAINT constr_realm_enabl_event_types PRIMARY KEY (realm_id, value);


--
-- Name: realm_events_listeners constr_realm_events_listeners; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_events_listeners
    ADD CONSTRAINT constr_realm_events_listeners PRIMARY KEY (realm_id, value);


--
-- Name: realm_supported_locales constr_realm_supported_locales; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_supported_locales
    ADD CONSTRAINT constr_realm_supported_locales PRIMARY KEY (realm_id, value);


--
-- Name: identity_provider constraint_2b; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT constraint_2b PRIMARY KEY (internal_id);


--
-- Name: client_attributes constraint_3c; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_attributes
    ADD CONSTRAINT constraint_3c PRIMARY KEY (client_id, name);


--
-- Name: event_entity constraint_4; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.event_entity
    ADD CONSTRAINT constraint_4 PRIMARY KEY (id);


--
-- Name: federated_identity constraint_40; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.federated_identity
    ADD CONSTRAINT constraint_40 PRIMARY KEY (identity_provider, user_id);


--
-- Name: realm constraint_4a; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm
    ADD CONSTRAINT constraint_4a PRIMARY KEY (id);


--
-- Name: client_session_role constraint_5; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_role
    ADD CONSTRAINT constraint_5 PRIMARY KEY (client_session, role_id);


--
-- Name: user_session constraint_57; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_session
    ADD CONSTRAINT constraint_57 PRIMARY KEY (id);


--
-- Name: user_federation_provider constraint_5c; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_provider
    ADD CONSTRAINT constraint_5c PRIMARY KEY (id);


--
-- Name: client_session_note constraint_5e; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_note
    ADD CONSTRAINT constraint_5e PRIMARY KEY (client_session, name);


--
-- Name: client constraint_7; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client
    ADD CONSTRAINT constraint_7 PRIMARY KEY (id);


--
-- Name: client_session constraint_8; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session
    ADD CONSTRAINT constraint_8 PRIMARY KEY (id);


--
-- Name: scope_mapping constraint_81; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.scope_mapping
    ADD CONSTRAINT constraint_81 PRIMARY KEY (client_id, role_id);


--
-- Name: client_node_registrations constraint_84; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_node_registrations
    ADD CONSTRAINT constraint_84 PRIMARY KEY (client_id, name);


--
-- Name: realm_attribute constraint_9; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_attribute
    ADD CONSTRAINT constraint_9 PRIMARY KEY (name, realm_id);


--
-- Name: realm_required_credential constraint_92; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_required_credential
    ADD CONSTRAINT constraint_92 PRIMARY KEY (realm_id, type);


--
-- Name: keycloak_role constraint_a; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT constraint_a PRIMARY KEY (id);


--
-- Name: admin_event_entity constraint_admin_event_entity; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.admin_event_entity
    ADD CONSTRAINT constraint_admin_event_entity PRIMARY KEY (id);


--
-- Name: authenticator_config_entry constraint_auth_cfg_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authenticator_config_entry
    ADD CONSTRAINT constraint_auth_cfg_pk PRIMARY KEY (authenticator_id, name);


--
-- Name: authentication_execution constraint_auth_exec_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT constraint_auth_exec_pk PRIMARY KEY (id);


--
-- Name: authentication_flow constraint_auth_flow_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authentication_flow
    ADD CONSTRAINT constraint_auth_flow_pk PRIMARY KEY (id);


--
-- Name: authenticator_config constraint_auth_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authenticator_config
    ADD CONSTRAINT constraint_auth_pk PRIMARY KEY (id);


--
-- Name: client_session_auth_status constraint_auth_status_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_auth_status
    ADD CONSTRAINT constraint_auth_status_pk PRIMARY KEY (client_session, authenticator);


--
-- Name: user_role_mapping constraint_c; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_role_mapping
    ADD CONSTRAINT constraint_c PRIMARY KEY (role_id, user_id);


--
-- Name: composite_role constraint_composite_role; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT constraint_composite_role PRIMARY KEY (composite, child_role);


--
-- Name: client_session_prot_mapper constraint_cs_pmp_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_prot_mapper
    ADD CONSTRAINT constraint_cs_pmp_pk PRIMARY KEY (client_session, protocol_mapper_id);


--
-- Name: identity_provider_config constraint_d; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider_config
    ADD CONSTRAINT constraint_d PRIMARY KEY (identity_provider_id, name);


--
-- Name: policy_config constraint_dpc; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.policy_config
    ADD CONSTRAINT constraint_dpc PRIMARY KEY (policy_id, name);


--
-- Name: realm_smtp_config constraint_e; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_smtp_config
    ADD CONSTRAINT constraint_e PRIMARY KEY (realm_id, name);


--
-- Name: credential constraint_f; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.credential
    ADD CONSTRAINT constraint_f PRIMARY KEY (id);


--
-- Name: user_federation_config constraint_f9; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_config
    ADD CONSTRAINT constraint_f9 PRIMARY KEY (user_federation_provider_id, name);


--
-- Name: resource_server_perm_ticket constraint_fapmt; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT constraint_fapmt PRIMARY KEY (id);


--
-- Name: resource_server_resource constraint_farsr; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT constraint_farsr PRIMARY KEY (id);


--
-- Name: resource_server_policy constraint_farsrp; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT constraint_farsrp PRIMARY KEY (id);


--
-- Name: associated_policy constraint_farsrpap; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT constraint_farsrpap PRIMARY KEY (policy_id, associated_policy_id);


--
-- Name: resource_policy constraint_farsrpp; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT constraint_farsrpp PRIMARY KEY (resource_id, policy_id);


--
-- Name: resource_server_scope constraint_farsrs; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT constraint_farsrs PRIMARY KEY (id);


--
-- Name: resource_scope constraint_farsrsp; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT constraint_farsrsp PRIMARY KEY (resource_id, scope_id);


--
-- Name: scope_policy constraint_farsrsps; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT constraint_farsrsps PRIMARY KEY (scope_id, policy_id);


--
-- Name: user_entity constraint_fb; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT constraint_fb PRIMARY KEY (id);


--
-- Name: user_federation_mapper_config constraint_fedmapper_cfg_pm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_mapper_config
    ADD CONSTRAINT constraint_fedmapper_cfg_pm PRIMARY KEY (user_federation_mapper_id, name);


--
-- Name: user_federation_mapper constraint_fedmapperpm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT constraint_fedmapperpm PRIMARY KEY (id);


--
-- Name: fed_user_consent_cl_scope constraint_fgrntcsnt_clsc_pm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.fed_user_consent_cl_scope
    ADD CONSTRAINT constraint_fgrntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent_client_scope constraint_grntcsnt_clsc_pm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_consent_client_scope
    ADD CONSTRAINT constraint_grntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent constraint_grntcsnt_pm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT constraint_grntcsnt_pm PRIMARY KEY (id);


--
-- Name: keycloak_group constraint_group; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.keycloak_group
    ADD CONSTRAINT constraint_group PRIMARY KEY (id);


--
-- Name: group_attribute constraint_group_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.group_attribute
    ADD CONSTRAINT constraint_group_attribute_pk PRIMARY KEY (id);


--
-- Name: group_role_mapping constraint_group_role; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.group_role_mapping
    ADD CONSTRAINT constraint_group_role PRIMARY KEY (role_id, group_id);


--
-- Name: identity_provider_mapper constraint_idpm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider_mapper
    ADD CONSTRAINT constraint_idpm PRIMARY KEY (id);


--
-- Name: idp_mapper_config constraint_idpmconfig; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.idp_mapper_config
    ADD CONSTRAINT constraint_idpmconfig PRIMARY KEY (idp_mapper_id, name);


--
-- Name: migration_model constraint_migmod; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.migration_model
    ADD CONSTRAINT constraint_migmod PRIMARY KEY (id);


--
-- Name: offline_client_session constraint_offl_cl_ses_pk3; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.offline_client_session
    ADD CONSTRAINT constraint_offl_cl_ses_pk3 PRIMARY KEY (user_session_id, client_id, client_storage_provider, external_client_id, offline_flag);


--
-- Name: offline_user_session constraint_offl_us_ses_pk2; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.offline_user_session
    ADD CONSTRAINT constraint_offl_us_ses_pk2 PRIMARY KEY (user_session_id, offline_flag);


--
-- Name: protocol_mapper constraint_pcm; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT constraint_pcm PRIMARY KEY (id);


--
-- Name: protocol_mapper_config constraint_pmconfig; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.protocol_mapper_config
    ADD CONSTRAINT constraint_pmconfig PRIMARY KEY (protocol_mapper_id, name);


--
-- Name: redirect_uris constraint_redirect_uris; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.redirect_uris
    ADD CONSTRAINT constraint_redirect_uris PRIMARY KEY (client_id, value);


--
-- Name: required_action_config constraint_req_act_cfg_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.required_action_config
    ADD CONSTRAINT constraint_req_act_cfg_pk PRIMARY KEY (required_action_id, name);


--
-- Name: required_action_provider constraint_req_act_prv_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.required_action_provider
    ADD CONSTRAINT constraint_req_act_prv_pk PRIMARY KEY (id);


--
-- Name: user_required_action constraint_required_action; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_required_action
    ADD CONSTRAINT constraint_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: resource_uris constraint_resour_uris_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_uris
    ADD CONSTRAINT constraint_resour_uris_pk PRIMARY KEY (resource_id, value);


--
-- Name: role_attribute constraint_role_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.role_attribute
    ADD CONSTRAINT constraint_role_attribute_pk PRIMARY KEY (id);


--
-- Name: user_attribute constraint_user_attribute_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_attribute
    ADD CONSTRAINT constraint_user_attribute_pk PRIMARY KEY (id);


--
-- Name: user_group_membership constraint_user_group; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_group_membership
    ADD CONSTRAINT constraint_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: user_session_note constraint_usn_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_session_note
    ADD CONSTRAINT constraint_usn_pk PRIMARY KEY (user_session, name);


--
-- Name: web_origins constraint_web_origins; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.web_origins
    ADD CONSTRAINT constraint_web_origins PRIMARY KEY (client_id, value);


--
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- Name: client_scope_attributes pk_cl_tmpl_attr; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope_attributes
    ADD CONSTRAINT pk_cl_tmpl_attr PRIMARY KEY (scope_id, name);


--
-- Name: client_scope pk_cli_template; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope
    ADD CONSTRAINT pk_cli_template PRIMARY KEY (id);


--
-- Name: resource_server pk_resource_server; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server
    ADD CONSTRAINT pk_resource_server PRIMARY KEY (id);


--
-- Name: client_scope_role_mapping pk_template_scope; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope_role_mapping
    ADD CONSTRAINT pk_template_scope PRIMARY KEY (scope_id, role_id);


--
-- Name: default_client_scope r_def_cli_scope_bind; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.default_client_scope
    ADD CONSTRAINT r_def_cli_scope_bind PRIMARY KEY (realm_id, scope_id);


--
-- Name: realm_localizations realm_localizations_pkey; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_localizations
    ADD CONSTRAINT realm_localizations_pkey PRIMARY KEY (realm_id, locale);


--
-- Name: resource_attribute res_attr_pk; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_attribute
    ADD CONSTRAINT res_attr_pk PRIMARY KEY (id);


--
-- Name: keycloak_group sibling_names; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.keycloak_group
    ADD CONSTRAINT sibling_names UNIQUE (realm_id, parent_group, name);


--
-- Name: identity_provider uk_2daelwnibji49avxsrtuf6xj33; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT uk_2daelwnibji49avxsrtuf6xj33 UNIQUE (provider_alias, realm_id);


--
-- Name: client uk_b71cjlbenv945rb6gcon438at; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client
    ADD CONSTRAINT uk_b71cjlbenv945rb6gcon438at UNIQUE (realm_id, client_id);


--
-- Name: client_scope uk_cli_scope; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope
    ADD CONSTRAINT uk_cli_scope UNIQUE (realm_id, name);


--
-- Name: user_entity uk_dykn684sl8up1crfei6eckhd7; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT uk_dykn684sl8up1crfei6eckhd7 UNIQUE (realm_id, email_constraint);


--
-- Name: resource_server_resource uk_frsr6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5ha6 UNIQUE (name, owner, resource_server_id);


--
-- Name: resource_server_perm_ticket uk_frsr6t700s9v50bu18ws5pmt; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5pmt UNIQUE (owner, requester, resource_server_id, resource_id, scope_id);


--
-- Name: resource_server_policy uk_frsrpt700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT uk_frsrpt700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: resource_server_scope uk_frsrst700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT uk_frsrst700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: user_consent uk_jkuwuvd56ontgsuhogm8uewrt; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT uk_jkuwuvd56ontgsuhogm8uewrt UNIQUE (client_id, client_storage_provider, external_client_id, user_id);


--
-- Name: realm uk_orvsdmla56612eaefiq6wl5oi; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm
    ADD CONSTRAINT uk_orvsdmla56612eaefiq6wl5oi UNIQUE (name);


--
-- Name: user_entity uk_ru8tt6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_entity
    ADD CONSTRAINT uk_ru8tt6t700s9v50bu18ws5ha6 UNIQUE (realm_id, username);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq UNIQUE (user_id, group_id);


--
-- Name: auth_user auth_user_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq UNIQUE (user_id, permission_id);


--
-- Name: auth_user auth_user_username_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_username_key UNIQUE (username);


--
-- Name: cpm_baselines cpm_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cpm_baselines
    ADD CONSTRAINT cpm_baselines_pkey PRIMARY KEY (id);


--
-- Name: cpm_issue_data cpm_issue_data_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cpm_issue_data
    ADD CONSTRAINT cpm_issue_data_pkey PRIMARY KEY (issue_id);


--
-- Name: cycle_issues cycle_issues_cycle_issue_unique; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycle_issues
    ADD CONSTRAINT cycle_issues_cycle_issue_unique UNIQUE (cycle_id, issue_id);


--
-- Name: cycle_issues cycle_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycle_issues
    ADD CONSTRAINT cycle_issues_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_celery_beat_clockedschedule django_celery_beat_clockedschedule_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_clockedschedule
    ADD CONSTRAINT django_celery_beat_clockedschedule_pkey PRIMARY KEY (id);


--
-- Name: django_celery_beat_crontabschedule django_celery_beat_crontabschedule_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_crontabschedule
    ADD CONSTRAINT django_celery_beat_crontabschedule_pkey PRIMARY KEY (id);


--
-- Name: django_celery_beat_intervalschedule django_celery_beat_intervalschedule_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_intervalschedule
    ADD CONSTRAINT django_celery_beat_intervalschedule_pkey PRIMARY KEY (id);


--
-- Name: django_celery_beat_periodictask django_celery_beat_periodictask_name_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictask
    ADD CONSTRAINT django_celery_beat_periodictask_name_key UNIQUE (name);


--
-- Name: django_celery_beat_periodictask django_celery_beat_periodictask_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictask
    ADD CONSTRAINT django_celery_beat_periodictask_pkey PRIMARY KEY (id);


--
-- Name: django_celery_beat_periodictasks django_celery_beat_periodictasks_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictasks
    ADD CONSTRAINT django_celery_beat_periodictasks_pkey PRIMARY KEY (ident);


--
-- Name: django_celery_beat_solarschedule django_celery_beat_solar_event_latitude_longitude_ba64999a_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_solarschedule
    ADD CONSTRAINT django_celery_beat_solar_event_latitude_longitude_ba64999a_uniq UNIQUE (event, latitude, longitude);


--
-- Name: django_celery_beat_solarschedule django_celery_beat_solarschedule_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_solarschedule
    ADD CONSTRAINT django_celery_beat_solarschedule_pkey PRIMARY KEY (id);


--
-- Name: django_celery_results_chordcounter django_celery_results_chordcounter_group_id_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_results_chordcounter
    ADD CONSTRAINT django_celery_results_chordcounter_group_id_key UNIQUE (group_id);


--
-- Name: django_celery_results_chordcounter django_celery_results_chordcounter_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_results_chordcounter
    ADD CONSTRAINT django_celery_results_chordcounter_pkey PRIMARY KEY (id);


--
-- Name: django_celery_results_groupresult django_celery_results_groupresult_group_id_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_results_groupresult
    ADD CONSTRAINT django_celery_results_groupresult_group_id_key UNIQUE (group_id);


--
-- Name: django_celery_results_groupresult django_celery_results_groupresult_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_results_groupresult
    ADD CONSTRAINT django_celery_results_groupresult_pkey PRIMARY KEY (id);


--
-- Name: django_celery_results_taskresult django_celery_results_taskresult_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_results_taskresult
    ADD CONSTRAINT django_celery_results_taskresult_pkey PRIMARY KEY (id);


--
-- Name: django_celery_results_taskresult django_celery_results_taskresult_task_id_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_results_taskresult
    ADD CONSTRAINT django_celery_results_taskresult_task_id_key UNIQUE (task_id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: health_check_db_testmodel health_check_db_testmodel_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.health_check_db_testmodel
    ADD CONSTRAINT health_check_db_testmodel_pkey PRIMARY KEY (id);


--
-- Name: issue_activities issue_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_activities
    ADD CONSTRAINT issue_activities_pkey PRIMARY KEY (id);


--
-- Name: issue_attachments issue_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_attachments
    ADD CONSTRAINT issue_attachments_pkey PRIMARY KEY (id);


--
-- Name: issue_comments issue_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_comments
    ADD CONSTRAINT issue_comments_pkey PRIMARY KEY (id);


--
-- Name: issue_labels issue_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_labels
    ADD CONSTRAINT issue_labels_pkey PRIMARY KEY (issue_id, label_id);


--
-- Name: issue_relations issue_relations_issue_id_related_id_relation_type_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_relations
    ADD CONSTRAINT issue_relations_issue_id_related_id_relation_type_key UNIQUE (issue_id, related_id, relation_type);


--
-- Name: issue_relations issue_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_relations
    ADD CONSTRAINT issue_relations_pkey PRIMARY KEY (id);


--
-- Name: issue_states issue_states_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_states
    ADD CONSTRAINT issue_states_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: issues issues_project_id_sequence_id_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_project_id_sequence_id_key UNIQUE (project_id, sequence_id);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);


--
-- Name: member_capacities member_capacities_member_id_year_month_6b4a4951_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.member_capacities
    ADD CONSTRAINT member_capacities_member_id_year_month_6b4a4951_uniq UNIQUE (member_id, year, month);


--
-- Name: member_capacities member_capacities_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.member_capacities
    ADD CONSTRAINT member_capacities_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: module_issues module_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.module_issues
    ADD CONSTRAINT module_issues_pkey PRIMARY KEY (module_id, issue_id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: objective_projects objective_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.objective_projects
    ADD CONSTRAINT objective_projects_pkey PRIMARY KEY (objective_id, project_id);


--
-- Name: portfolio_cost_entries portfolio_cost_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_cost_entries
    ADD CONSTRAINT portfolio_cost_entries_pkey PRIMARY KEY (id);


--
-- Name: portfolio_objectives portfolio_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_objectives
    ADD CONSTRAINT portfolio_objectives_pkey PRIMARY KEY (id);


--
-- Name: portfolio_project_deps portfolio_project_deps_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_project_deps
    ADD CONSTRAINT portfolio_project_deps_pkey PRIMARY KEY (id);


--
-- Name: portfolio_project_deps portfolio_project_deps_predecessor_id_successor_id_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_project_deps
    ADD CONSTRAINT portfolio_project_deps_predecessor_id_successor_id_key UNIQUE (predecessor_id, successor_id);


--
-- Name: portfolio_projects portfolio_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_projects
    ADD CONSTRAINT portfolio_projects_pkey PRIMARY KEY (id);


--
-- Name: portfolio_projects portfolio_projects_portfolio_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_projects
    ADD CONSTRAINT portfolio_projects_portfolio_id_project_id_key UNIQUE (portfolio_id, project_id);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, member_id);


--
-- Name: project_risks project_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT project_risks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_workspace_id_identifier_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_workspace_id_identifier_key UNIQUE (workspace_id, identifier);


--
-- Name: resource_profiles resource_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.resource_profiles
    ADD CONSTRAINT resource_profiles_pkey PRIMARY KEY (id);


--
-- Name: resource_profiles resource_profiles_project_id_member_id_7881c6e2_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.resource_profiles
    ADD CONSTRAINT resource_profiles_project_id_member_id_7881c6e2_uniq UNIQUE (project_id, member_id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: wiki_issue_links wiki_issue_links_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_issue_links
    ADD CONSTRAINT wiki_issue_links_pkey PRIMARY KEY (page_id, issue_id);


--
-- Name: wiki_page_comments wiki_page_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_comments
    ADD CONSTRAINT wiki_page_comments_pkey PRIMARY KEY (id);


--
-- Name: wiki_page_versions wiki_page_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_versions
    ADD CONSTRAINT wiki_page_versions_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (id);


--
-- Name: wiki_spaces wiki_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_spaces
    ADD CONSTRAINT wiki_spaces_pkey PRIMARY KEY (id);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);


--
-- Name: workspace_members workspace_members_workspace_id_keycloak_sub_8853a4d5_uniq; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_keycloak_sub_8853a4d5_uniq UNIQUE (workspace_id, keycloak_sub);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);


--
-- Name: idx_admin_event_time; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_admin_event_time ON keycloak.admin_event_entity USING btree (realm_id, admin_event_time);


--
-- Name: idx_assoc_pol_assoc_pol_id; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_assoc_pol_assoc_pol_id ON keycloak.associated_policy USING btree (associated_policy_id);


--
-- Name: idx_auth_config_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_auth_config_realm ON keycloak.authenticator_config USING btree (realm_id);


--
-- Name: idx_auth_exec_flow; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_auth_exec_flow ON keycloak.authentication_execution USING btree (flow_id);


--
-- Name: idx_auth_exec_realm_flow; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_auth_exec_realm_flow ON keycloak.authentication_execution USING btree (realm_id, flow_id);


--
-- Name: idx_auth_flow_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_auth_flow_realm ON keycloak.authentication_flow USING btree (realm_id);


--
-- Name: idx_cl_clscope; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_cl_clscope ON keycloak.client_scope_client USING btree (scope_id);


--
-- Name: idx_client_id; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_client_id ON keycloak.client USING btree (client_id);


--
-- Name: idx_client_init_acc_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_client_init_acc_realm ON keycloak.client_initial_access USING btree (realm_id);


--
-- Name: idx_client_session_session; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_client_session_session ON keycloak.client_session USING btree (session_id);


--
-- Name: idx_clscope_attrs; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_clscope_attrs ON keycloak.client_scope_attributes USING btree (scope_id);


--
-- Name: idx_clscope_cl; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_clscope_cl ON keycloak.client_scope_client USING btree (client_id);


--
-- Name: idx_clscope_protmap; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_clscope_protmap ON keycloak.protocol_mapper USING btree (client_scope_id);


--
-- Name: idx_clscope_role; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_clscope_role ON keycloak.client_scope_role_mapping USING btree (scope_id);


--
-- Name: idx_compo_config_compo; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_compo_config_compo ON keycloak.component_config USING btree (component_id);


--
-- Name: idx_component_provider_type; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_component_provider_type ON keycloak.component USING btree (provider_type);


--
-- Name: idx_component_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_component_realm ON keycloak.component USING btree (realm_id);


--
-- Name: idx_composite; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_composite ON keycloak.composite_role USING btree (composite);


--
-- Name: idx_composite_child; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_composite_child ON keycloak.composite_role USING btree (child_role);


--
-- Name: idx_defcls_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_defcls_realm ON keycloak.default_client_scope USING btree (realm_id);


--
-- Name: idx_defcls_scope; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_defcls_scope ON keycloak.default_client_scope USING btree (scope_id);


--
-- Name: idx_event_time; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_event_time ON keycloak.event_entity USING btree (realm_id, event_time);


--
-- Name: idx_fedidentity_feduser; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fedidentity_feduser ON keycloak.federated_identity USING btree (federated_user_id);


--
-- Name: idx_fedidentity_user; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fedidentity_user ON keycloak.federated_identity USING btree (user_id);


--
-- Name: idx_fu_attribute; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_attribute ON keycloak.fed_user_attribute USING btree (user_id, realm_id, name);


--
-- Name: idx_fu_cnsnt_ext; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_cnsnt_ext ON keycloak.fed_user_consent USING btree (user_id, client_storage_provider, external_client_id);


--
-- Name: idx_fu_consent; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_consent ON keycloak.fed_user_consent USING btree (user_id, client_id);


--
-- Name: idx_fu_consent_ru; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_consent_ru ON keycloak.fed_user_consent USING btree (realm_id, user_id);


--
-- Name: idx_fu_credential; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_credential ON keycloak.fed_user_credential USING btree (user_id, type);


--
-- Name: idx_fu_credential_ru; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_credential_ru ON keycloak.fed_user_credential USING btree (realm_id, user_id);


--
-- Name: idx_fu_group_membership; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_group_membership ON keycloak.fed_user_group_membership USING btree (user_id, group_id);


--
-- Name: idx_fu_group_membership_ru; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_group_membership_ru ON keycloak.fed_user_group_membership USING btree (realm_id, user_id);


--
-- Name: idx_fu_required_action; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_required_action ON keycloak.fed_user_required_action USING btree (user_id, required_action);


--
-- Name: idx_fu_required_action_ru; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_required_action_ru ON keycloak.fed_user_required_action USING btree (realm_id, user_id);


--
-- Name: idx_fu_role_mapping; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_role_mapping ON keycloak.fed_user_role_mapping USING btree (user_id, role_id);


--
-- Name: idx_fu_role_mapping_ru; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_fu_role_mapping_ru ON keycloak.fed_user_role_mapping USING btree (realm_id, user_id);


--
-- Name: idx_group_att_by_name_value; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_group_att_by_name_value ON keycloak.group_attribute USING btree (name, ((value)::character varying(250)));


--
-- Name: idx_group_attr_group; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_group_attr_group ON keycloak.group_attribute USING btree (group_id);


--
-- Name: idx_group_role_mapp_group; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_group_role_mapp_group ON keycloak.group_role_mapping USING btree (group_id);


--
-- Name: idx_id_prov_mapp_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_id_prov_mapp_realm ON keycloak.identity_provider_mapper USING btree (realm_id);


--
-- Name: idx_ident_prov_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_ident_prov_realm ON keycloak.identity_provider USING btree (realm_id);


--
-- Name: idx_keycloak_role_client; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_keycloak_role_client ON keycloak.keycloak_role USING btree (client);


--
-- Name: idx_keycloak_role_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_keycloak_role_realm ON keycloak.keycloak_role USING btree (realm);


--
-- Name: idx_offline_css_preload; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_offline_css_preload ON keycloak.offline_client_session USING btree (client_id, offline_flag);


--
-- Name: idx_offline_uss_by_user; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_offline_uss_by_user ON keycloak.offline_user_session USING btree (user_id, realm_id, offline_flag);


--
-- Name: idx_offline_uss_by_usersess; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_offline_uss_by_usersess ON keycloak.offline_user_session USING btree (realm_id, offline_flag, user_session_id);


--
-- Name: idx_offline_uss_createdon; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_offline_uss_createdon ON keycloak.offline_user_session USING btree (created_on);


--
-- Name: idx_offline_uss_preload; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_offline_uss_preload ON keycloak.offline_user_session USING btree (offline_flag, created_on, user_session_id);


--
-- Name: idx_protocol_mapper_client; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_protocol_mapper_client ON keycloak.protocol_mapper USING btree (client_id);


--
-- Name: idx_realm_attr_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_attr_realm ON keycloak.realm_attribute USING btree (realm_id);


--
-- Name: idx_realm_clscope; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_clscope ON keycloak.client_scope USING btree (realm_id);


--
-- Name: idx_realm_def_grp_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_def_grp_realm ON keycloak.realm_default_groups USING btree (realm_id);


--
-- Name: idx_realm_evt_list_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_evt_list_realm ON keycloak.realm_events_listeners USING btree (realm_id);


--
-- Name: idx_realm_evt_types_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_evt_types_realm ON keycloak.realm_enabled_event_types USING btree (realm_id);


--
-- Name: idx_realm_master_adm_cli; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_master_adm_cli ON keycloak.realm USING btree (master_admin_client);


--
-- Name: idx_realm_supp_local_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_realm_supp_local_realm ON keycloak.realm_supported_locales USING btree (realm_id);


--
-- Name: idx_redir_uri_client; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_redir_uri_client ON keycloak.redirect_uris USING btree (client_id);


--
-- Name: idx_req_act_prov_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_req_act_prov_realm ON keycloak.required_action_provider USING btree (realm_id);


--
-- Name: idx_res_policy_policy; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_res_policy_policy ON keycloak.resource_policy USING btree (policy_id);


--
-- Name: idx_res_scope_scope; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_res_scope_scope ON keycloak.resource_scope USING btree (scope_id);


--
-- Name: idx_res_serv_pol_res_serv; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_res_serv_pol_res_serv ON keycloak.resource_server_policy USING btree (resource_server_id);


--
-- Name: idx_res_srv_res_res_srv; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_res_srv_res_res_srv ON keycloak.resource_server_resource USING btree (resource_server_id);


--
-- Name: idx_res_srv_scope_res_srv; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_res_srv_scope_res_srv ON keycloak.resource_server_scope USING btree (resource_server_id);


--
-- Name: idx_role_attribute; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_role_attribute ON keycloak.role_attribute USING btree (role_id);


--
-- Name: idx_role_clscope; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_role_clscope ON keycloak.client_scope_role_mapping USING btree (role_id);


--
-- Name: idx_scope_mapping_role; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_scope_mapping_role ON keycloak.scope_mapping USING btree (role_id);


--
-- Name: idx_scope_policy_policy; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_scope_policy_policy ON keycloak.scope_policy USING btree (policy_id);


--
-- Name: idx_update_time; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_update_time ON keycloak.migration_model USING btree (update_time);


--
-- Name: idx_us_sess_id_on_cl_sess; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_us_sess_id_on_cl_sess ON keycloak.offline_client_session USING btree (user_session_id);


--
-- Name: idx_usconsent_clscope; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_usconsent_clscope ON keycloak.user_consent_client_scope USING btree (user_consent_id);


--
-- Name: idx_user_attribute; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_attribute ON keycloak.user_attribute USING btree (user_id);


--
-- Name: idx_user_attribute_name; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_attribute_name ON keycloak.user_attribute USING btree (name, value);


--
-- Name: idx_user_consent; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_consent ON keycloak.user_consent USING btree (user_id);


--
-- Name: idx_user_credential; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_credential ON keycloak.credential USING btree (user_id);


--
-- Name: idx_user_email; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_email ON keycloak.user_entity USING btree (email);


--
-- Name: idx_user_group_mapping; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_group_mapping ON keycloak.user_group_membership USING btree (user_id);


--
-- Name: idx_user_reqactions; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_reqactions ON keycloak.user_required_action USING btree (user_id);


--
-- Name: idx_user_role_mapping; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_role_mapping ON keycloak.user_role_mapping USING btree (user_id);


--
-- Name: idx_user_service_account; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_user_service_account ON keycloak.user_entity USING btree (realm_id, service_account_client_link);


--
-- Name: idx_usr_fed_map_fed_prv; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_usr_fed_map_fed_prv ON keycloak.user_federation_mapper USING btree (federation_provider_id);


--
-- Name: idx_usr_fed_map_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_usr_fed_map_realm ON keycloak.user_federation_mapper USING btree (realm_id);


--
-- Name: idx_usr_fed_prv_realm; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_usr_fed_prv_realm ON keycloak.user_federation_provider USING btree (realm_id);


--
-- Name: idx_web_orig_client; Type: INDEX; Schema: keycloak; Owner: projecthub
--

CREATE INDEX idx_web_orig_client ON keycloak.web_origins USING btree (client_id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: auth_user_groups_group_id_97559544; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_user_groups_group_id_97559544 ON public.auth_user_groups USING btree (group_id);


--
-- Name: auth_user_groups_user_id_6a12ed8b; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_user_groups_user_id_6a12ed8b ON public.auth_user_groups USING btree (user_id);


--
-- Name: auth_user_user_permissions_permission_id_1fbb5f2c; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_user_user_permissions_permission_id_1fbb5f2c ON public.auth_user_user_permissions USING btree (permission_id);


--
-- Name: auth_user_user_permissions_user_id_a95ead1b; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_user_user_permissions_user_id_a95ead1b ON public.auth_user_user_permissions USING btree (user_id);


--
-- Name: auth_user_username_6821ab7c_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX auth_user_username_6821ab7c_like ON public.auth_user USING btree (username varchar_pattern_ops);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_cele_date_cr_bd6c1d_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_date_cr_bd6c1d_idx ON public.django_celery_results_groupresult USING btree (date_created);


--
-- Name: django_cele_date_cr_f04a50_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_date_cr_f04a50_idx ON public.django_celery_results_taskresult USING btree (date_created);


--
-- Name: django_cele_date_do_caae0e_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_date_do_caae0e_idx ON public.django_celery_results_groupresult USING btree (date_done);


--
-- Name: django_cele_date_do_f59aad_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_date_do_f59aad_idx ON public.django_celery_results_taskresult USING btree (date_done);


--
-- Name: django_cele_status_9b6201_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_status_9b6201_idx ON public.django_celery_results_taskresult USING btree (status);


--
-- Name: django_cele_task_na_08aec9_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_task_na_08aec9_idx ON public.django_celery_results_taskresult USING btree (task_name);


--
-- Name: django_cele_worker_d54dd8_idx; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_cele_worker_d54dd8_idx ON public.django_celery_results_taskresult USING btree (worker);


--
-- Name: django_celery_beat_periodictask_clocked_id_47a69f82; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_beat_periodictask_clocked_id_47a69f82 ON public.django_celery_beat_periodictask USING btree (clocked_id);


--
-- Name: django_celery_beat_periodictask_crontab_id_d3cba168; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_beat_periodictask_crontab_id_d3cba168 ON public.django_celery_beat_periodictask USING btree (crontab_id);


--
-- Name: django_celery_beat_periodictask_interval_id_a8ca27da; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_beat_periodictask_interval_id_a8ca27da ON public.django_celery_beat_periodictask USING btree (interval_id);


--
-- Name: django_celery_beat_periodictask_name_265a36b7_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_beat_periodictask_name_265a36b7_like ON public.django_celery_beat_periodictask USING btree (name varchar_pattern_ops);


--
-- Name: django_celery_beat_periodictask_solar_id_a87ce72c; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_beat_periodictask_solar_id_a87ce72c ON public.django_celery_beat_periodictask USING btree (solar_id);


--
-- Name: django_celery_results_chordcounter_group_id_1f70858c_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_results_chordcounter_group_id_1f70858c_like ON public.django_celery_results_chordcounter USING btree (group_id varchar_pattern_ops);


--
-- Name: django_celery_results_groupresult_group_id_a085f1a9_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_results_groupresult_group_id_a085f1a9_like ON public.django_celery_results_groupresult USING btree (group_id varchar_pattern_ops);


--
-- Name: django_celery_results_taskresult_task_id_de0d95bf_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_celery_results_taskresult_task_id_de0d95bf_like ON public.django_celery_results_taskresult USING btree (task_id varchar_pattern_ops);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_workspace; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_audit_logs_workspace ON public.audit_logs USING btree (workspace_id, created_at DESC);


--
-- Name: idx_cpm_baselines_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_cpm_baselines_project ON public.cpm_baselines USING btree (project_id);


--
-- Name: idx_cycle_issues_issue; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_cycle_issues_issue ON public.cycle_issues USING btree (issue_id);


--
-- Name: idx_cycles_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_cycles_project ON public.cycles USING btree (project_id);


--
-- Name: idx_issue_activities_created; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_activities_created ON public.issue_activities USING btree (created_at DESC);


--
-- Name: idx_issue_activities_issue; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_activities_issue ON public.issue_activities USING btree (issue_id);


--
-- Name: idx_issue_attachments_issue; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_attachments_issue ON public.issue_attachments USING btree (issue_id);


--
-- Name: idx_issue_comments_issue; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_comments_issue ON public.issue_comments USING btree (issue_id);


--
-- Name: idx_issue_relations_issue; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_relations_issue ON public.issue_relations USING btree (issue_id);


--
-- Name: idx_issue_relations_related; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_relations_related ON public.issue_relations USING btree (related_id);


--
-- Name: idx_issue_states_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issue_states_project ON public.issue_states USING btree (project_id);


--
-- Name: idx_issues_assignee; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_assignee ON public.issues USING btree (assignee_id);


--
-- Name: idx_issues_due_date; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_due_date ON public.issues USING btree (due_date);


--
-- Name: idx_issues_epic; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_epic ON public.issues USING btree (epic_id);


--
-- Name: idx_issues_fts; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_fts ON public.issues USING gin (to_tsvector('portuguese'::regconfig, (((title)::text || ' '::text) || COALESCE((description)::text, ''::text))));


--
-- Name: idx_issues_milestone; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_milestone ON public.issues USING btree (milestone_id);


--
-- Name: idx_issues_parent; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_parent ON public.issues USING btree (parent_id);


--
-- Name: idx_issues_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_project ON public.issues USING btree (project_id);


--
-- Name: idx_issues_state; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_state ON public.issues USING btree (state_id);


--
-- Name: idx_issues_updated_at; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_issues_updated_at ON public.issues USING btree (updated_at DESC);


--
-- Name: idx_labels_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_labels_project ON public.labels USING btree (project_id);


--
-- Name: idx_milestones_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_milestones_project ON public.milestones USING btree (project_id);


--
-- Name: idx_modules_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_modules_project ON public.modules USING btree (project_id);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id, is_read, created_at DESC);


--
-- Name: idx_portfolio_cost_entries_pp; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_portfolio_cost_entries_pp ON public.portfolio_cost_entries USING btree (portfolio_project_id);


--
-- Name: idx_portfolio_objectives_portfolio; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_portfolio_objectives_portfolio ON public.portfolio_objectives USING btree (portfolio_id);


--
-- Name: idx_portfolio_projects_portfolio; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_portfolio_projects_portfolio ON public.portfolio_projects USING btree (portfolio_id);


--
-- Name: idx_portfolio_projects_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_portfolio_projects_project ON public.portfolio_projects USING btree (project_id);


--
-- Name: idx_portfolios_workspace; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_portfolios_workspace ON public.portfolios USING btree (workspace_id);


--
-- Name: idx_project_risks_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_project_risks_project ON public.project_risks USING btree (project_id);


--
-- Name: idx_project_risks_score; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_project_risks_score ON public.project_risks USING btree (score DESC);


--
-- Name: idx_project_risks_status; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_project_risks_status ON public.project_risks USING btree (status);


--
-- Name: idx_projects_workspace; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_projects_workspace ON public.projects USING btree (workspace_id);


--
-- Name: idx_wiki_issue_links_issue; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_issue_links_issue ON public.wiki_issue_links USING btree (issue_id);


--
-- Name: idx_wiki_page_comments_page; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_page_comments_page ON public.wiki_page_comments USING btree (page_id);


--
-- Name: idx_wiki_page_versions_page; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_page_versions_page ON public.wiki_page_versions USING btree (page_id, version DESC);


--
-- Name: idx_wiki_pages_fts; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_pages_fts ON public.wiki_pages USING gin (to_tsvector('portuguese'::regconfig, (((title)::text || ' '::text) || COALESCE((content)::text, ''::text))));


--
-- Name: idx_wiki_pages_parent; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_pages_parent ON public.wiki_pages USING btree (parent_id);


--
-- Name: idx_wiki_pages_published; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_pages_published ON public.wiki_pages USING btree (published_token) WHERE (published_token IS NOT NULL);


--
-- Name: idx_wiki_pages_space; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_pages_space ON public.wiki_pages USING btree (space_id);


--
-- Name: idx_wiki_spaces_project; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_spaces_project ON public.wiki_spaces USING btree (project_id);


--
-- Name: idx_wiki_spaces_workspace; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_wiki_spaces_workspace ON public.wiki_spaces USING btree (workspace_id);


--
-- Name: idx_workspace_members_email; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_workspace_members_email ON public.workspace_members USING btree (email);


--
-- Name: idx_workspace_members_workspace; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX idx_workspace_members_workspace ON public.workspace_members USING btree (workspace_id);


--
-- Name: member_capacities_member_id_7a6b8bb3; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX member_capacities_member_id_7a6b8bb3 ON public.member_capacities USING btree (member_id);


--
-- Name: resource_profiles_member_id_dbfd0113; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX resource_profiles_member_id_dbfd0113 ON public.resource_profiles USING btree (member_id);


--
-- Name: resource_profiles_project_id_f4ffd52e; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX resource_profiles_project_id_f4ffd52e ON public.resource_profiles USING btree (project_id);


--
-- Name: time_entries_issue_id_946dd0db; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX time_entries_issue_id_946dd0db ON public.time_entries USING btree (issue_id);


--
-- Name: time_entries_member_id_20ad37d8; Type: INDEX; Schema: public; Owner: projecthub
--

CREATE INDEX time_entries_member_id_20ad37d8 ON public.time_entries USING btree (member_id);


--
-- Name: project_risks set_updated_at_project_risks; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER set_updated_at_project_risks BEFORE UPDATE ON public.project_risks FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: cycles trg_cycles_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: issue_comments trg_issue_comments_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_issue_comments_updated_at BEFORE UPDATE ON public.issue_comments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: issues trg_issues_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: modules trg_modules_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: portfolio_objectives trg_portfolio_objectives_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_portfolio_objectives_updated_at BEFORE UPDATE ON public.portfolio_objectives FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: portfolio_projects trg_portfolio_projects_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_portfolio_projects_updated_at BEFORE UPDATE ON public.portfolio_projects FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: portfolios trg_portfolios_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: wiki_pages trg_wiki_pages_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_wiki_pages_updated_at BEFORE UPDATE ON public.wiki_pages FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: wiki_spaces trg_wiki_spaces_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_wiki_spaces_updated_at BEFORE UPDATE ON public.wiki_spaces FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: workspace_members trg_workspace_members_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_workspace_members_updated_at BEFORE UPDATE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: workspaces trg_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: projecthub
--

CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: client_session_auth_status auth_status_constraint; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_auth_status
    ADD CONSTRAINT auth_status_constraint FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: identity_provider fk2b4ebc52ae5c3b34; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider
    ADD CONSTRAINT fk2b4ebc52ae5c3b34 FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_attributes fk3c47c64beacca966; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_attributes
    ADD CONSTRAINT fk3c47c64beacca966 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: federated_identity fk404288b92ef007a6; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.federated_identity
    ADD CONSTRAINT fk404288b92ef007a6 FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: client_node_registrations fk4129723ba992f594; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_node_registrations
    ADD CONSTRAINT fk4129723ba992f594 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: client_session_note fk5edfb00ff51c2736; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_note
    ADD CONSTRAINT fk5edfb00ff51c2736 FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: user_session_note fk5edfb00ff51d3472; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_session_note
    ADD CONSTRAINT fk5edfb00ff51d3472 FOREIGN KEY (user_session) REFERENCES keycloak.user_session(id);


--
-- Name: client_session_role fk_11b7sgqw18i532811v7o2dv76; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_role
    ADD CONSTRAINT fk_11b7sgqw18i532811v7o2dv76 FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: redirect_uris fk_1burs8pb4ouj97h5wuppahv9f; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.redirect_uris
    ADD CONSTRAINT fk_1burs8pb4ouj97h5wuppahv9f FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: user_federation_provider fk_1fj32f6ptolw2qy60cd8n01e8; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_provider
    ADD CONSTRAINT fk_1fj32f6ptolw2qy60cd8n01e8 FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_session_prot_mapper fk_33a8sgqw18i532811v7o2dk89; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session_prot_mapper
    ADD CONSTRAINT fk_33a8sgqw18i532811v7o2dk89 FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: realm_required_credential fk_5hg65lybevavkqfki3kponh9v; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_required_credential
    ADD CONSTRAINT fk_5hg65lybevavkqfki3kponh9v FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: resource_attribute fk_5hrm2vlf9ql5fu022kqepovbr; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu022kqepovbr FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: user_attribute fk_5hrm2vlf9ql5fu043kqepovbr; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu043kqepovbr FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: user_required_action fk_6qj3w1jw9cvafhe19bwsiuvmd; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_required_action
    ADD CONSTRAINT fk_6qj3w1jw9cvafhe19bwsiuvmd FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: keycloak_role fk_6vyqfe4cn4wlq8r6kt5vdsj5c; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.keycloak_role
    ADD CONSTRAINT fk_6vyqfe4cn4wlq8r6kt5vdsj5c FOREIGN KEY (realm) REFERENCES keycloak.realm(id);


--
-- Name: realm_smtp_config fk_70ej8xdxgxd0b9hh6180irr0o; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_smtp_config
    ADD CONSTRAINT fk_70ej8xdxgxd0b9hh6180irr0o FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_attribute fk_8shxd6l3e9atqukacxgpffptw; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_attribute
    ADD CONSTRAINT fk_8shxd6l3e9atqukacxgpffptw FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: composite_role fk_a63wvekftu8jo1pnj81e7mce2; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT fk_a63wvekftu8jo1pnj81e7mce2 FOREIGN KEY (composite) REFERENCES keycloak.keycloak_role(id);


--
-- Name: authentication_execution fk_auth_exec_flow; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT fk_auth_exec_flow FOREIGN KEY (flow_id) REFERENCES keycloak.authentication_flow(id);


--
-- Name: authentication_execution fk_auth_exec_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authentication_execution
    ADD CONSTRAINT fk_auth_exec_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: authentication_flow fk_auth_flow_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authentication_flow
    ADD CONSTRAINT fk_auth_flow_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: authenticator_config fk_auth_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.authenticator_config
    ADD CONSTRAINT fk_auth_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: client_session fk_b4ao2vcvat6ukau74wbwtfqo1; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_session
    ADD CONSTRAINT fk_b4ao2vcvat6ukau74wbwtfqo1 FOREIGN KEY (session_id) REFERENCES keycloak.user_session(id);


--
-- Name: user_role_mapping fk_c4fqv34p1mbylloxang7b1q3l; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_role_mapping
    ADD CONSTRAINT fk_c4fqv34p1mbylloxang7b1q3l FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: client_scope_attributes fk_cl_scope_attr_scope; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope_attributes
    ADD CONSTRAINT fk_cl_scope_attr_scope FOREIGN KEY (scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_scope_role_mapping fk_cl_scope_rm_scope; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_scope_role_mapping
    ADD CONSTRAINT fk_cl_scope_rm_scope FOREIGN KEY (scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_user_session_note fk_cl_usr_ses_note; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_user_session_note
    ADD CONSTRAINT fk_cl_usr_ses_note FOREIGN KEY (client_session) REFERENCES keycloak.client_session(id);


--
-- Name: protocol_mapper fk_cli_scope_mapper; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT fk_cli_scope_mapper FOREIGN KEY (client_scope_id) REFERENCES keycloak.client_scope(id);


--
-- Name: client_initial_access fk_client_init_acc_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.client_initial_access
    ADD CONSTRAINT fk_client_init_acc_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: component_config fk_component_config; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.component_config
    ADD CONSTRAINT fk_component_config FOREIGN KEY (component_id) REFERENCES keycloak.component(id);


--
-- Name: component fk_component_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.component
    ADD CONSTRAINT fk_component_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_default_groups fk_def_groups_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_default_groups
    ADD CONSTRAINT fk_def_groups_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_federation_mapper_config fk_fedmapper_cfg; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_mapper_config
    ADD CONSTRAINT fk_fedmapper_cfg FOREIGN KEY (user_federation_mapper_id) REFERENCES keycloak.user_federation_mapper(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_fedprv; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_fedprv FOREIGN KEY (federation_provider_id) REFERENCES keycloak.user_federation_provider(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: associated_policy fk_frsr5s213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT fk_frsr5s213xcx4wnkog82ssrfy FOREIGN KEY (associated_policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrasp13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT fk_frsrasp13xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog82sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82sspmt FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_server_resource fk_frsrho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_resource
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog83sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog83sspmt FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog84sspmt; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog84sspmt FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: associated_policy fk_frsrpas14xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.associated_policy
    ADD CONSTRAINT fk_frsrpas14xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrpass3xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.scope_policy
    ADD CONSTRAINT fk_frsrpass3xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: resource_server_perm_ticket fk_frsrpo2128cx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrpo2128cx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_server_policy fk_frsrpo213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_policy
    ADD CONSTRAINT fk_frsrpo213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: resource_scope fk_frsrpos13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT fk_frsrpos13xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpos53xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT fk_frsrpos53xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpp213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_policy
    ADD CONSTRAINT fk_frsrpp213xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: resource_scope fk_frsrps213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_scope
    ADD CONSTRAINT fk_frsrps213xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES keycloak.resource_server_scope(id);


--
-- Name: resource_server_scope fk_frsrso213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_server_scope
    ADD CONSTRAINT fk_frsrso213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES keycloak.resource_server(id);


--
-- Name: composite_role fk_gr7thllb9lu8q4vqa4524jjy8; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.composite_role
    ADD CONSTRAINT fk_gr7thllb9lu8q4vqa4524jjy8 FOREIGN KEY (child_role) REFERENCES keycloak.keycloak_role(id);


--
-- Name: user_consent_client_scope fk_grntcsnt_clsc_usc; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_consent_client_scope
    ADD CONSTRAINT fk_grntcsnt_clsc_usc FOREIGN KEY (user_consent_id) REFERENCES keycloak.user_consent(id);


--
-- Name: user_consent fk_grntcsnt_user; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_consent
    ADD CONSTRAINT fk_grntcsnt_user FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: group_attribute fk_group_attribute_group; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.group_attribute
    ADD CONSTRAINT fk_group_attribute_group FOREIGN KEY (group_id) REFERENCES keycloak.keycloak_group(id);


--
-- Name: group_role_mapping fk_group_role_group; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.group_role_mapping
    ADD CONSTRAINT fk_group_role_group FOREIGN KEY (group_id) REFERENCES keycloak.keycloak_group(id);


--
-- Name: realm_enabled_event_types fk_h846o4h0w8epx5nwedrf5y69j; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_enabled_event_types
    ADD CONSTRAINT fk_h846o4h0w8epx5nwedrf5y69j FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: realm_events_listeners fk_h846o4h0w8epx5nxev9f5y69j; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_events_listeners
    ADD CONSTRAINT fk_h846o4h0w8epx5nxev9f5y69j FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: identity_provider_mapper fk_idpm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider_mapper
    ADD CONSTRAINT fk_idpm_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: idp_mapper_config fk_idpmconfig; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.idp_mapper_config
    ADD CONSTRAINT fk_idpmconfig FOREIGN KEY (idp_mapper_id) REFERENCES keycloak.identity_provider_mapper(id);


--
-- Name: web_origins fk_lojpho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.web_origins
    ADD CONSTRAINT fk_lojpho213xcx4wnkog82ssrfy FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: scope_mapping fk_ouse064plmlr732lxjcn1q5f1; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.scope_mapping
    ADD CONSTRAINT fk_ouse064plmlr732lxjcn1q5f1 FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: protocol_mapper fk_pcm_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.protocol_mapper
    ADD CONSTRAINT fk_pcm_realm FOREIGN KEY (client_id) REFERENCES keycloak.client(id);


--
-- Name: credential fk_pfyr0glasqyl0dei3kl69r6v0; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.credential
    ADD CONSTRAINT fk_pfyr0glasqyl0dei3kl69r6v0 FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: protocol_mapper_config fk_pmconfig; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.protocol_mapper_config
    ADD CONSTRAINT fk_pmconfig FOREIGN KEY (protocol_mapper_id) REFERENCES keycloak.protocol_mapper(id);


--
-- Name: default_client_scope fk_r_def_cli_scope_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.default_client_scope
    ADD CONSTRAINT fk_r_def_cli_scope_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: required_action_provider fk_req_act_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.required_action_provider
    ADD CONSTRAINT fk_req_act_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: resource_uris fk_resource_server_uris; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.resource_uris
    ADD CONSTRAINT fk_resource_server_uris FOREIGN KEY (resource_id) REFERENCES keycloak.resource_server_resource(id);


--
-- Name: role_attribute fk_role_attribute_id; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.role_attribute
    ADD CONSTRAINT fk_role_attribute_id FOREIGN KEY (role_id) REFERENCES keycloak.keycloak_role(id);


--
-- Name: realm_supported_locales fk_supported_locales_realm; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.realm_supported_locales
    ADD CONSTRAINT fk_supported_locales_realm FOREIGN KEY (realm_id) REFERENCES keycloak.realm(id);


--
-- Name: user_federation_config fk_t13hpu1j94r2ebpekr39x5eu5; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_federation_config
    ADD CONSTRAINT fk_t13hpu1j94r2ebpekr39x5eu5 FOREIGN KEY (user_federation_provider_id) REFERENCES keycloak.user_federation_provider(id);


--
-- Name: user_group_membership fk_user_group_user; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.user_group_membership
    ADD CONSTRAINT fk_user_group_user FOREIGN KEY (user_id) REFERENCES keycloak.user_entity(id);


--
-- Name: policy_config fkdc34197cf864c4e43; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.policy_config
    ADD CONSTRAINT fkdc34197cf864c4e43 FOREIGN KEY (policy_id) REFERENCES keycloak.resource_server_policy(id);


--
-- Name: identity_provider_config fkdc4897cf864c4e43; Type: FK CONSTRAINT; Schema: keycloak; Owner: projecthub
--

ALTER TABLE ONLY keycloak.identity_provider_config
    ADD CONSTRAINT fkdc4897cf864c4e43 FOREIGN KEY (identity_provider_id) REFERENCES keycloak.identity_provider(internal_id);


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cpm_baselines cpm_baselines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cpm_baselines
    ADD CONSTRAINT cpm_baselines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id);


--
-- Name: cpm_baselines cpm_baselines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cpm_baselines
    ADD CONSTRAINT cpm_baselines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: cpm_issue_data cpm_issue_data_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cpm_issue_data
    ADD CONSTRAINT cpm_issue_data_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: cycle_issues cycle_issues_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycle_issues
    ADD CONSTRAINT cycle_issues_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE;


--
-- Name: cycle_issues cycle_issues_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycle_issues
    ADD CONSTRAINT cycle_issues_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: cycles cycles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: cycles cycles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_celery_beat_periodictask django_celery_beat_p_clocked_id_47a69f82_fk_django_ce; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictask
    ADD CONSTRAINT django_celery_beat_p_clocked_id_47a69f82_fk_django_ce FOREIGN KEY (clocked_id) REFERENCES public.django_celery_beat_clockedschedule(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_celery_beat_periodictask django_celery_beat_p_crontab_id_d3cba168_fk_django_ce; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictask
    ADD CONSTRAINT django_celery_beat_p_crontab_id_d3cba168_fk_django_ce FOREIGN KEY (crontab_id) REFERENCES public.django_celery_beat_crontabschedule(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_celery_beat_periodictask django_celery_beat_p_interval_id_a8ca27da_fk_django_ce; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictask
    ADD CONSTRAINT django_celery_beat_p_interval_id_a8ca27da_fk_django_ce FOREIGN KEY (interval_id) REFERENCES public.django_celery_beat_intervalschedule(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_celery_beat_periodictask django_celery_beat_p_solar_id_a87ce72c_fk_django_ce; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.django_celery_beat_periodictask
    ADD CONSTRAINT django_celery_beat_p_solar_id_a87ce72c_fk_django_ce FOREIGN KEY (solar_id) REFERENCES public.django_celery_beat_solarschedule(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: issue_activities issue_activities_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_activities
    ADD CONSTRAINT issue_activities_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: issue_activities issue_activities_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_activities
    ADD CONSTRAINT issue_activities_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_attachments issue_attachments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_attachments
    ADD CONSTRAINT issue_attachments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_attachments issue_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_attachments
    ADD CONSTRAINT issue_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.workspace_members(id);


--
-- Name: issue_comments issue_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_comments
    ADD CONSTRAINT issue_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.workspace_members(id) ON DELETE CASCADE;


--
-- Name: issue_comments issue_comments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_comments
    ADD CONSTRAINT issue_comments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_labels issue_labels_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_labels
    ADD CONSTRAINT issue_labels_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_labels issue_labels_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_labels
    ADD CONSTRAINT issue_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE;


--
-- Name: issue_relations issue_relations_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_relations
    ADD CONSTRAINT issue_relations_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_relations issue_relations_related_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_relations
    ADD CONSTRAINT issue_relations_related_id_fkey FOREIGN KEY (related_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_states issue_states_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issue_states
    ADD CONSTRAINT issue_states_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: issues issues_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: issues issues_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: issues issues_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.issues(id) ON DELETE SET NULL;


--
-- Name: issues issues_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE SET NULL;


--
-- Name: issues issues_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.issues(id) ON DELETE SET NULL;


--
-- Name: issues issues_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: issues issues_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: issues issues_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.issue_states(id) ON DELETE SET NULL;


--
-- Name: labels labels_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: member_capacities member_capacities_member_id_7a6b8bb3_fk_workspace_members_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.member_capacities
    ADD CONSTRAINT member_capacities_member_id_7a6b8bb3_fk_workspace_members_id FOREIGN KEY (member_id) REFERENCES public.workspace_members(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: milestones milestones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: milestones milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: module_issues module_issues_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.module_issues
    ADD CONSTRAINT module_issues_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: module_issues module_issues_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.module_issues
    ADD CONSTRAINT module_issues_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: modules modules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: modules modules_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: modules modules_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.workspace_members(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: objective_projects objective_projects_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.objective_projects
    ADD CONSTRAINT objective_projects_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.portfolio_objectives(id) ON DELETE CASCADE;


--
-- Name: objective_projects objective_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.objective_projects
    ADD CONSTRAINT objective_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: portfolio_cost_entries portfolio_cost_entries_portfolio_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_cost_entries
    ADD CONSTRAINT portfolio_cost_entries_portfolio_project_id_fkey FOREIGN KEY (portfolio_project_id) REFERENCES public.portfolio_projects(id) ON DELETE CASCADE;


--
-- Name: portfolio_cost_entries portfolio_cost_entries_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_cost_entries
    ADD CONSTRAINT portfolio_cost_entries_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.workspace_members(id);


--
-- Name: portfolio_objectives portfolio_objectives_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_objectives
    ADD CONSTRAINT portfolio_objectives_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_project_deps portfolio_project_deps_predecessor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_project_deps
    ADD CONSTRAINT portfolio_project_deps_predecessor_id_fkey FOREIGN KEY (predecessor_id) REFERENCES public.portfolio_projects(id) ON DELETE CASCADE;


--
-- Name: portfolio_project_deps portfolio_project_deps_successor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_project_deps
    ADD CONSTRAINT portfolio_project_deps_successor_id_fkey FOREIGN KEY (successor_id) REFERENCES public.portfolio_projects(id) ON DELETE CASCADE;


--
-- Name: portfolio_projects portfolio_projects_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_projects
    ADD CONSTRAINT portfolio_projects_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_projects portfolio_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolio_projects
    ADD CONSTRAINT portfolio_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: portfolios portfolios_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: portfolios portfolios_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.workspace_members(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_risks project_risks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT project_risks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE RESTRICT;


--
-- Name: project_risks project_risks_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT project_risks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: project_risks project_risks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT project_risks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: projects projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: resource_profiles resource_profiles_member_id_dbfd0113_fk_workspace_members_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.resource_profiles
    ADD CONSTRAINT resource_profiles_member_id_dbfd0113_fk_workspace_members_id FOREIGN KEY (member_id) REFERENCES public.workspace_members(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: resource_profiles resource_profiles_project_id_f4ffd52e_fk_projects_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.resource_profiles
    ADD CONSTRAINT resource_profiles_project_id_f4ffd52e_fk_projects_id FOREIGN KEY (project_id) REFERENCES public.projects(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: time_entries time_entries_issue_id_946dd0db_fk_issues_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_issue_id_946dd0db_fk_issues_id FOREIGN KEY (issue_id) REFERENCES public.issues(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: time_entries time_entries_member_id_20ad37d8_fk_workspace_members_id; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_member_id_20ad37d8_fk_workspace_members_id FOREIGN KEY (member_id) REFERENCES public.workspace_members(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: wiki_issue_links wiki_issue_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_issue_links
    ADD CONSTRAINT wiki_issue_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: wiki_issue_links wiki_issue_links_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_issue_links
    ADD CONSTRAINT wiki_issue_links_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: wiki_issue_links wiki_issue_links_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_issue_links
    ADD CONSTRAINT wiki_issue_links_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id) ON DELETE CASCADE;


--
-- Name: wiki_page_comments wiki_page_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_comments
    ADD CONSTRAINT wiki_page_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.workspace_members(id);


--
-- Name: wiki_page_comments wiki_page_comments_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_comments
    ADD CONSTRAINT wiki_page_comments_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id) ON DELETE CASCADE;


--
-- Name: wiki_page_comments wiki_page_comments_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_comments
    ADD CONSTRAINT wiki_page_comments_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.workspace_members(id);


--
-- Name: wiki_page_versions wiki_page_versions_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_versions
    ADD CONSTRAINT wiki_page_versions_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.wiki_pages(id) ON DELETE CASCADE;


--
-- Name: wiki_page_versions wiki_page_versions_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_page_versions
    ADD CONSTRAINT wiki_page_versions_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES public.workspace_members(id);


--
-- Name: wiki_pages wiki_pages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id);


--
-- Name: wiki_pages wiki_pages_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.wiki_pages(id) ON DELETE CASCADE;


--
-- Name: wiki_pages wiki_pages_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.wiki_spaces(id) ON DELETE CASCADE;


--
-- Name: wiki_pages wiki_pages_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.workspace_members(id);


--
-- Name: wiki_spaces wiki_spaces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_spaces
    ADD CONSTRAINT wiki_spaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workspace_members(id) ON DELETE SET NULL;


--
-- Name: wiki_spaces wiki_spaces_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_spaces
    ADD CONSTRAINT wiki_spaces_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: wiki_spaces wiki_spaces_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.wiki_spaces
    ADD CONSTRAINT wiki_spaces_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: projecthub
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 51I2pdA9XhpqcHNs8U4puOFhLYEhMAeO1uGzG88X0803WoyPqBD9iU2eknmpl5U

