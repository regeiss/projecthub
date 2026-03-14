"""
Algoritmo CPM (Critical Path Method) usando NetworkX.

Notação Activity-on-Node (AON) com suporte a 4 tipos de relação:
  - FS (Finish-to-Start): successor.ES >= predecessor.EF + lag
  - SS (Start-to-Start):  successor.ES >= predecessor.ES + lag
  - FF (Finish-to-Finish): successor.EF >= predecessor.EF + lag
  - SF (Start-to-Finish): successor.EF >= predecessor.ES + lag

Forward pass:  calcula ES e EF para cada nó em ordem topológica.
Backward pass: calcula LS e LF em ordem topológica reversa.
Slack = LS - ES. Caminho crítico = nós com slack == 0.
"""

import logging

import networkx as nx

logger = logging.getLogger(__name__)

CPM_RELATION_TYPES = frozenset(
    ["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"]
)


def _build_graph(project_id: str):
    """
    Constrói um DiGraph NetworkX com as issues e relações CPM do projeto.
    Retorna (G, durations) onde durations = {issue_id_str: int}.
    """
    from apps.cpm.models import CpmIssueData
    from apps.issues.models import Issue, IssueRelation

    issues = list(Issue.objects.filter(project_id=project_id).values("id"))
    cpm_map = {
        str(d.issue_id): d.duration_days
        for d in CpmIssueData.objects.filter(issue__project_id=project_id)
    }

    G = nx.DiGraph()
    for issue in issues:
        iid = str(issue["id"])
        G.add_node(iid, duration=cpm_map.get(iid, 1))

    relations = IssueRelation.objects.filter(
        issue__project_id=project_id,
        relation_type__in=CPM_RELATION_TYPES,
    ).values("issue_id", "related_issue_id", "relation_type", "lag_days")

    for rel in relations:
        src = str(rel["issue_id"])
        dst = str(rel["related_issue_id"])
        if src in G and dst in G:
            G.add_edge(
                src,
                dst,
                relation_type=rel["relation_type"],
                lag=rel["lag_days"] or 0,
            )

    # Remove ciclos para garantir DAG válido
    if not nx.is_directed_acyclic_graph(G):
        logger.warning("Ciclos detectados no grafo CPM do projeto %s — removendo", project_id)
        try:
            for u, v in list(nx.find_cycle(G, orientation="original")):
                if G.has_edge(u, v):
                    G.remove_edge(u, v)
        except nx.NetworkXNoCycle:
            pass

    return G


def _forward_pass(G: nx.DiGraph) -> tuple[dict, dict]:
    """Calcula ES e EF em ordem topológica."""
    es: dict[str, int] = {}
    ef: dict[str, int] = {}

    for node in nx.topological_sort(G):
        dur = G.nodes[node]["duration"]
        preds = list(G.predecessors(node))

        if not preds:
            es[node] = 0
        else:
            candidates = []
            for pred in preds:
                edge = G.edges[pred, node]
                rel = edge.get("relation_type", "finish_to_start")
                lag = edge.get("lag", 0)
                dur_node = dur

                if rel == "finish_to_start":
                    candidates.append(ef[pred] + lag)
                elif rel == "start_to_start":
                    candidates.append(es[pred] + lag)
                elif rel == "finish_to_finish":
                    # EF(node) >= EF(pred) + lag  →  ES(node) >= EF(pred) + lag - dur(node)
                    candidates.append(ef[pred] + lag - dur_node)
                elif rel == "start_to_finish":
                    # EF(node) >= ES(pred) + lag  →  ES(node) >= ES(pred) + lag - dur(node)
                    candidates.append(es[pred] + lag - dur_node)

            es[node] = max(candidates) if candidates else 0

        es[node] = max(es[node], 0)  # nunca negativo
        ef[node] = es[node] + dur

    return es, ef


def _backward_pass(G: nx.DiGraph, es: dict, ef: dict, project_duration: int) -> tuple[dict, dict]:
    """Calcula LS e LF em ordem topológica reversa."""
    ls: dict[str, int] = {}
    lf: dict[str, int] = {}

    for node in reversed(list(nx.topological_sort(G))):
        dur = G.nodes[node]["duration"]
        succs = list(G.successors(node))

        if not succs:
            lf[node] = project_duration
        else:
            candidates = []
            for succ in succs:
                edge = G.edges[node, succ]
                rel = edge.get("relation_type", "finish_to_start")
                lag = edge.get("lag", 0)

                if rel == "finish_to_start":
                    # FS: EF(node) + lag <= ES(succ)  →  LF(node) <= LS(succ) - lag
                    candidates.append(ls[succ] - lag)
                elif rel == "start_to_start":
                    # SS: ES(node) + lag <= ES(succ)  →  LS(node) = LS(succ) - lag
                    #                                  →  LF(node) = LS(node) + dur
                    candidates.append(ls[succ] - lag + dur)
                elif rel == "finish_to_finish":
                    # FF: EF(node) + lag <= EF(succ)  →  LF(node) <= LF(succ) - lag
                    candidates.append(lf[succ] - lag)
                elif rel == "start_to_finish":
                    # SF: ES(node) + lag <= EF(succ)  →  LS(node) = LF(succ) - lag
                    #                                  →  LF(node) = LS(node) + dur
                    candidates.append(lf[succ] - lag + dur)

            lf[node] = min(candidates) if candidates else project_duration

        ls[node] = lf[node] - dur

    return ls, lf


def calcular_cpm(project_id: str) -> dict:
    """
    Executa o algoritmo CPM para um projeto.

    Retorna:
    {
        "nodes": {
            "<issue_id>": {
                "es": int, "ef": int, "ls": int, "lf": int,
                "slack": int, "is_critical": bool, "duration": int
            }
        },
        "critical_path": ["<issue_id>", ...],   # IDs em ordem topológica
        "project_duration": int,                 # dias
        "edges": [{"source": str, "target": str, "relation_type": str, "lag": int}]
    }
    """
    G = _build_graph(project_id)

    if G.number_of_nodes() == 0:
        return {"nodes": {}, "critical_path": [], "project_duration": 0, "edges": []}

    es, ef = _forward_pass(G)

    project_duration = max(ef.values()) if ef else 0

    ls, lf = _backward_pass(G, es, ef, project_duration)

    nodes_result = {}
    critical_path_nodes = []
    topo_order = list(nx.topological_sort(G))

    for node in topo_order:
        slack = ls[node] - es[node]
        is_critical = slack == 0
        nodes_result[node] = {
            "es": es[node],
            "ef": ef[node],
            "ls": ls[node],
            "lf": lf[node],
            "slack": slack,
            "is_critical": is_critical,
            "duration": G.nodes[node]["duration"],
        }
        if is_critical:
            critical_path_nodes.append(node)

    edges_result = [
        {
            "source": u,
            "target": v,
            "relation_type": data.get("relation_type", "finish_to_start"),
            "lag": data.get("lag", 0),
        }
        for u, v, data in G.edges(data=True)
    ]

    return {
        "nodes": nodes_result,
        "critical_path": critical_path_nodes,
        "project_duration": project_duration,
        "edges": edges_result,
    }


def build_react_flow_graph(cpm_result: dict, issues_map: dict) -> dict:
    """
    Converte resultado CPM para o formato React Flow.

    issues_map = {issue_id_str: {title, sequence_id, state_id, ...}}
    """
    rf_nodes = []
    rf_edges = []

    # Layout simples: posiciona por camada (ES)
    # O frontend pode sobrescrever com auto-layout (dagre/elk)
    layer_count: dict[int, int] = {}

    for node_id, data in cpm_result["nodes"].items():
        layer = data["es"]
        pos_y = layer_count.get(layer, 0) * 120
        layer_count[layer] = layer_count.get(layer, 0) + 1

        issue = issues_map.get(node_id, {})
        rf_nodes.append(
            {
                "id": node_id,
                "type": "cpmNode",
                "position": {"x": layer * 200, "y": pos_y},
                "data": {
                    "label": issue.get("title", node_id),
                    "sequence_id": issue.get("sequence_id"),
                    "duration": data["duration"],
                    "es": data["es"],
                    "ef": data["ef"],
                    "ls": data["ls"],
                    "lf": data["lf"],
                    "slack": data["slack"],
                    "is_critical": data["is_critical"],
                },
            }
        )

    for i, edge in enumerate(cpm_result["edges"]):
        label = edge["relation_type"].replace("_", " ").upper()
        if edge["lag"]:
            label += f" +{edge['lag']}d"
        rf_edges.append(
            {
                "id": f"e{i}",
                "source": edge["source"],
                "target": edge["target"],
                "label": label,
                "style": {"stroke": "#EF4444"} if (
                    cpm_result["nodes"].get(edge["source"], {}).get("is_critical")
                    and cpm_result["nodes"].get(edge["target"], {}).get("is_critical")
                ) else {},
            }
        )

    return {"nodes": rf_nodes, "edges": rf_edges}


def build_gantt_data(cpm_result: dict, issues_map: dict, project_start) -> dict:
    """
    Converte resultado CPM para o formato Frappe Gantt.

    project_start: date — data zero do projeto (menor start_date das issues ou hoje).
    """
    from datetime import timedelta

    tasks = []
    id_to_seq = {
        node_id: cpm_result["nodes"][node_id]["es"]
        for node_id in cpm_result["nodes"]
    }

    for node_id, data in cpm_result["nodes"].items():
        issue = issues_map.get(node_id, {})
        start_date = project_start + timedelta(days=data["es"])
        end_date = project_start + timedelta(days=data["ef"])

        # Determina progresso a partir do estado da issue
        state_category = issue.get("state__category", "backlog")
        progress = 100 if state_category == "completed" else (
            50 if state_category in ("started",) else 0
        )

        tasks.append(
            {
                "id": node_id,
                "name": f"#{issue.get('sequence_id', '')} {issue.get('title', node_id)}",
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "progress": progress,
                "is_critical": data["is_critical"],
                "slack": data["slack"],
                "dependencies": [],  # preenchido abaixo
            }
        )

    # Monta dependências
    dep_map: dict[str, list] = {t["id"]: t for t in tasks}
    for edge in cpm_result["edges"]:
        if edge["target"] in dep_map:
            dep_map[edge["target"]]["dependencies"].append(edge["source"])

    # Converte lista de deps para string separada por vírgula (formato Frappe)
    for task in tasks:
        task["dependencies"] = ",".join(task["dependencies"])

    return {"tasks": tasks}
