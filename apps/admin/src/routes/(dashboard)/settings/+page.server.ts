/**
 * The settings index.
 *
 * Every key in the contract is listed, including ones nobody has written yet: "never set"
 * is a state an administrator needs to see and act on, and a list built from the table
 * would hide exactly those rows.
 *
 * Only the summaries cross the wire — a setting's value can be a whole FAQ list, and the
 * index has no room for thirteen of them.
 */

import { listSettings } from '$lib/server/settings/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ settings: await listSettings() });
