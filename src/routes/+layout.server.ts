import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
    if (event.locals.user) {
        return { user: event.locals.user.signatoryId }
    } else {
        return { user: null }
    }
}