#!/usr/bin/env python3
"""Valida data/*.json contra data/config.json. Uso: python3 scripts/validar.py"""
import json, re, sys, glob, os
from calendar import monthrange

base = os.path.join(os.path.dirname(__file__), "..", "data")
cfg = json.load(open(os.path.join(base, "config.json"), encoding="utf-8"))
meses = json.load(open(os.path.join(base, "meses.json"), encoding="utf-8"))
erros = []

def err(msg): erros.append(msg)

for k, l in cfg["locais"].items():
    if "geo" in l and not re.fullmatch(r"-?\d{1,2}\.\d+,-?\d{1,3}\.\d+", l["geo"]): err(f"config: 'geo' de {k} deve ser 'lat,lon' (ex.: -22.34,-48.79)")
    for c in ("end", "cidade"):
        if c in l and not str(l[c]).strip(): err(f"config: '{c}' de {k} está vazio")

for k, p in cfg["padres"].items():
    if not re.fullmatch(r"[A-Za-z0-9]+", k): err(f"config: código de padre inválido: {k}")
    for c in ("l", "d"):
        if not re.fullmatch(r"#[0-9a-fA-F]{3,8}", p.get(c, "")): err(f"config: cor {c} inválida para {k}")

arquivos = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(base, "20??-??.json")))
if sorted(meses) != arquivos:
    err(f"meses.json {sorted(meses)} difere dos arquivos {arquivos}")

for m in arquivos:
    d = json.load(open(os.path.join(base, m + ".json"), encoding="utf-8"))
    y, mo = map(int, m.split("-"))
    dim = monthrange(y, mo)[1]
    if d.get("mes") != m: err(f"{m}: campo 'mes' é {d.get('mes')!r}")
    for dia, itens in d["dias"].items():
        if not 1 <= int(dia) <= dim: err(f"{m}: dia {dia} fora do mês")
        horas = []
        for i in itens:
            if len(i) < 4: err(f"{m}-{dia}: item incompleto {i}"); continue
            h, l, t, p = i[:4]
            if not re.fullmatch(r"\d{1,2}h(\d{2})?", h): err(f"{m}-{dia}: horário inválido {h!r}")
            if l not in cfg["locais"]: err(f"{m}-{dia}: local desconhecido {l!r}")
            if t not in cfg["tipos"]: err(f"{m}-{dia}: tipo desconhecido {t!r}")
            if p not in cfg["padres"]: err(f"{m}-{dia}: padre desconhecido {p!r}")
    for f in d.get("destaques", []):
        if not 1 <= f[0] <= dim: err(f"{m}: destaque no dia {f[0]} fora do mês")
    total = sum(len(v) for v in d["dias"].values())
    print(f"{m}: {total} celebrações em {len(d['dias'])} dias com agenda")

if erros:
    print("\nERROS:"); [print(" -", e) for e in erros]; sys.exit(1)
print("OK: dados consistentes.")
