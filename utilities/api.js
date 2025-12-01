import { parseNumber } from "./general.js";
export async function getAssetInfo(assetId) {
    return (await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`)).json();
};

export async function getLocalUserInfo() {
    return (await fetch("https://users.roblox.com/v1/users/authenticated")).json();
};

export async function getUniverseId(placeId) {
    const json = await (await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`)).json();
    handleAPIErrors(json);
    const universeId = parseNumber(json.universeId); // Number("") === 0, Number(null) === 0 - What if ROBLOX makes their universe IDs start with 0?
	if (Number.isNaN(universeId)) throw new Error("Got invalid universe ID, please check your place ID");
    return universeId;
};

export async function getAssetBinary(id) {
    return (await fetch(`https://assetdelivery.roblox.com/v1/asset/?id=${id}`)).bytes();
};

// Just make any request fail and get token from the headers
export async function getCSRFToken() {
    // "https://auth.roblox.com/v2/logout"
    // "https://apis.roblox.com/assets/user-auth/v1/assets/0" PATCH
    return (await fetch("https://auth.roblox.com/v1/authentication-ticket",
        {
            method: "POST",
        }
    )).headers.get("x-csrf-token");
};

export async function uploadAsset(file, assetId, universeId, assetType, shouldPublish) {
    const fileConstructor = file?.constructor;
    if (fileConstructor !== File) throw new Error(`Expected File, got ${fileConstructor?.name}`);

    const isPlace = assetType === "Place";
    const csrfToken = await getCSRFToken();

    const form = new FormData();
    form.append("request", JSON.stringify({
        assetType,
        assetId,
        published: shouldPublish,
        creationContext: {}
    }));

    form.append("fileContent", file, file.name);

    return (await fetch(`https://apis.roblox.com/assets/user-auth/v1/assets/${assetId}`,
        {
            method: "PATCH",
            body: form,
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": csrfToken,
                "Roblox-Place-Id": isPlace ? assetId : undefined,
                "Roblox-Universe-Id": universeId
            }
        }
    )).json();
}

export function handleAPIErrors(json) {
    if ("errors" in json) {
        for (const error of json.errors) {
            throw new Error(error.message ?? "Something went wrong");
        }
    }
};

export async function isAssetEditable(assetId, userId) {
    if (userId === undefined) {
        const localUserInfo = await getLocalUserInfo();
        handleAPIErrors(localUserInfo);
        userId = localUserInfo.id;
    };

    const csrfToken = await getCSRFToken();
    const json = (await (await fetch("https://apis.roblox.com/asset-permissions-api/v1/assets/check-permissions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken
            },
            credentials: "include",
            body: JSON.stringify({
                requests: [
                    {
                        subject: {
                            subjectType: "User",
                            subjectId: userId
                        },
                        action: "Edit",
                        assetId
                    }
                ]
            })
        }
    )).json());
    handleAPIErrors(json);

    return json
        .results?.[0]
        .value
        .status !== "NoPermission";
}

export async function isValidUserInfo(forceLogin = true) {
	let isValid = true;
	if (info?.errors != null) {
		isValid = false;

		if (forceLogin) {
			window.alert("Please log into a valid ROBLOX account.");
			chrome.tabs.create({
				url: "https://www.roblox.com/login"
			});
			// window.open("https://www.roblox.com/login", "_blank");
			throw new Error("Invalid ROBLOX account");
		}
	};

	return isValid;
}

// https://apis.roblox.com/universes/v1/search
export async function getUniversesByUser(settings) {
	settings = {
		userId: null,
		isArchived: false,
		limit: 50, // 10, 25, 50, 100 Only for first
		cursor: null,
		sortOrder: "Asc", // Desc
		accessFilter: "Public",
		...settings
	};

	const { userId } = settings;
	const url =
		userId == null
			? new URL("https://develop.roblox.com/v1/user/universes")
			: new URL(`https://games.roblox.com/v2/users/${userId}/games`);

	url.search = new URLSearchParams(settings).toString();

	return (await fetch(url)).json();
};

export async function getAllUniverseInfo(settings) {
	settings = {
		universeIds: [],
		...settings
	};

	const url = new URL("https://games.roblox.com/v1/games");
	url.search = new URLSearchParams(settings).toString();

	return (await fetch(url)).json();
};

/*
GET https://apis.roblox.com/universes/v1/search
BODY
{
	CreatorType: "User",
	CreatorTargetId: null,
	IsArchived: false,
	PageSize: 25,
	SortParam: "LastUpdated",
	SortOrder: "Desc",
}
*/

export async function getPlaceIcons(settings) {
	settings = {
		placeIds: [],
		returnPolicy: "PlaceHolder", // AutoGenerated
		size: "512x512", // 150x150, 50x50
		format: "webp", // Png, Jpeg
		isCircular: false, // Doesn't work
		...settings,
	};

	const url = new URL("https://thumbnails.roblox.com/v1/places/gameicons");
	url.search = new URLSearchParams(settings).toString();

	return (await fetch(url)).json();
};

export async function getUniverseIcons(settings) {
	settings = {
		universeIds: [],
		returnPolicy: "AutoGenerated", // PlaceHolder
		size: "512x512", // 150x150, 50x50
		format: "webp", // Png, Jpeg
		isCircular: false, // Doesn't work
		...settings,
	};

	const url = new URL("https://thumbnails.roblox.com/v1/games/icons");
	url.search = new URLSearchParams(settings).toString();

	return (await fetch(url)).json();
};



export async function getAssetFromPlace(assetId, placeId, assetType = "Audio") { // Only for audios right now
	return (await fetch("https://assetdelivery.roblox.com/v2/assets/batch", {
		method: "POST",
		headers: {
			"User-Agent": "Roblox/WinInet",
			"Content-Type": "application/json",
			"Cookie": ".ROBLOSECURITY=" + await getCookie(),
			"Roblox-Place-Id": placeId,
			"Accept": "*/*",
			"Roblox-Browser-Asset-Request": "false",
		},
		body: JSON.stringify([{
			assetId,
			assetType,
			requestId: "0",
		}]),
	})).json();
};