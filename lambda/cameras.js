import model from './de-DE.json' with { type: 'json' };

export function cameraCatalog(interactionModel = model) {
    return interactionModel.interactionModel.languageModel.types
        .find(type => type.name === 'LIST_OF_WEBCAMS').values;
}

export const cameras = cameraCatalog();
const normalize = value => typeof value === 'string' ? value.trim().toLocaleLowerCase('de-DE') : '';
const choice = camera => ({ id: camera.id, name: camera.name.value });

/** Resolve only catalog IDs. Exact matches take precedence over pending choices. */
export function resolveCamera(slot, pendingChoices = [], catalog = cameras) {
    const authorities = slot?.resolutions?.resolutionsPerAuthority;
    if (!normalize(slot?.value) || !Array.isArray(authorities) || !authorities.length) {
        return { kind: 'unusable' };
    }
    const matches = authorities.filter(authority => authority?.status?.code === 'ER_SUCCESS_MATCH');
    if (!matches.length) {
        return { kind: authorities.every(authority => authority?.status?.code === 'ER_SUCCESS_NO_MATCH')
            ? 'no-match' : 'unusable' };
    }
    const ids = new Set();
    for (const authority of matches) {
        if (!Array.isArray(authority.values) || !authority.values.length) return { kind: 'unusable' };
        for (const entry of authority.values) {
            if (!catalog.some(camera => camera.id === entry?.value?.id)) return { kind: 'unusable' };
            ids.add(entry.value.id);
        }
    }
    let candidates = catalog.filter(camera => ids.has(camera.id));
    const exact = candidates.filter(camera => [camera.name.value, ...(camera.name.synonyms ?? [])]
        .some(name => normalize(name) === normalize(slot.value)));
    if (exact.length === 1) return { kind: 'selected', camera: choice(exact[0]) };
    const previous = candidates.filter(camera => Array.isArray(pendingChoices) && pendingChoices.includes(camera.id));
    if (previous.length) candidates = previous;
    return candidates.length === 1
        ? { kind: 'selected', camera: choice(candidates[0]) }
        : { kind: 'ambiguous', choices: candidates.map(choice) };
}
