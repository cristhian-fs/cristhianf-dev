#!/usr/bin/env bash

set -euo pipefail

CONTENT_TYPE="${1:-}"
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null &&pwd)

if [[ -z "$CONTENT_TYPE" ]]; then
	echo "Usage: create-content.sh <writing|craft|author|project>"
	exit 1
fi

case "$CONTENT_TYPE" in
	writing|project|craft|author) ;;
	*)
		echo "Invalid type: '$CONTENT_TYPE'"
		exit 1
		;;
esac
shift

# =======================
# =       HELPERS       =
# =======================
join_array() {
	local arr=("$@")
	local result=""
	for item in "${arr[@]}"; do
		result+="\"$item\","
	done
	echo "${result%,}"
}

require() {
	local var_name="$1"
	local value="$2:-"
	if [[ -z "$value" ]]; then
		echo "Missing --${var_name} value"
		exit 1
	fi
}

declare -A FLAGS_WITH_VALUES=(
	[title]=title
	[name]=name
	[description]=description
	[image]=image
	[avatar]=avatar
	[bio]=bio
	[mail]=mail
	[website]=website
	[twitter]=twitter
	[github]=github
	[linkedin]=linkedin
	[discord]=discord
	[startDate]=startDate
	[endDate]=endDate
	[link]=link
	[date]=date
)

tags=()
authors=()

# Arrays
LIST_FLAGS=(tags authors)

# Booleans
BOOL_FLAGS=(draft isCompleted)

while [[ $# -gt 0 ]]; do
	case "$1" in

		# --flag=value
		--*=*)
			key="${1%%=*}"	# before =
			value="${1#*=}" # after =

			key="${key#--}" # remove --
			
			if [[ -n "${FLAGS_WITH_VALUES[$key]:-}" ]]; then
				var="${FLAGS_WITH_VALUES[$key]}"
				printf -v "$var" '%s' "$value"

			elif [[ " ${LIST_FLAGS[*]} " == *" $key "* ]]; then
				IFS=',' read -ra "$key" <<< "$value"

			elif [[ " ${BOOL_FLAGS[*]} " == *" $key"* ]]; then
				printf -v "$key" '%s' "$value"

			else
				echo "Argumento desconhecido: --$key"
				exit 1
			fi

			shift
			;;

		# --no-flag
		--no-*)
			key="${1#--no-}"

			if [[ " ${BOOL_FLAGS[*]} " == *" $key "* ]]; then
				printf -v "$key" '%s' false
			else
				echo "Flag invalida: --no-$key"
				exit 1
			fi

			shift
			;;

		
		# 🔹 --flag value
		--*)
			key="${1#--}"

			if [[ -n "${FLAGS_WITH_VALUES[$key]:-}" ]]; then
				[[ ! "${2+x}" ]] && { echo "Error: --$key requires a value"; exit 1; }

				var="${FLAGS_WITH_VALUES[$key]}"
				printf -v "$var" '%s' "$2"
				shift 2

			elif [[ " ${LIST_FLAGS[*]} " == *" $key "* ]]; then
				[[ ! "${2+x}" ]] && { echo "Error: --$key requires a value"; exit 1; }

				IFS=',' read -ra "$key" <<< "$2"
				shift 2

			elif [[ " ${BOOL_FLAGS[*]} " == *" $key "* ]]; then
				printf -v "$key" '%s' true
				shift

			else
				echo "Argumento desconhecido: --$key"
				exit 1
			fi
			;;

		*)
			echo "Argumento desconhecido: $1"
			exit 1
			;;
	esac
done

if [[ "$CONTENT_TYPE" == "writing" ]]; then
	require "title" "${title:-}"
	require "description" "${description:-}"

	lower_case_title="${title,,}"
	lower_case_title="${lower_case_title// /-}"

	mkdir -p "${SCRIPT_DIR}/src/content/writing/${lower_case_title}"
	tags_str=$(join_array "${tags[@]}")
	authors_str=$(join_array "${authors[@]}")
	date=${date:-$(date +%Y-%m-%d)}

	FILE_PATH="${SCRIPT_DIR}/src/content/writing/${lower_case_title}"

	{
	    echo "---"
	    echo "title: \"$title\""
	    echo "description: \"$description\""
	    echo "date: $date"
	    echo "tags: [${tags_str}]"
	    [[ -n "${image:-}" ]]   && echo "image: \"$image\""
	    [[ -n "${authors:-}" ]] && echo "authors: [${authors_str}]"
	    echo "---"
	} > "${FILE_PATH}/index.mdx"

	echo "-----"
	echo "Writing created in ${FILE_PATH}/index.mdx"
	echo "-----"

elif [[ "$CONTENT_TYPE" == "craft" ]]; then
	require "title" "${title:-}"
	require "description" "${description:-}"
	require "image" "${image:-}"

	lower_case_title="${title,,}"
	lower_case_title="${lower_case_title// /-}"

	tags_str=$(join_array "${tags[@]}")

	date=${date:-$(date +%Y-%m-%d)}
	
	FILE_PATH="${SCRIPT_DIR}/src/content/craft/${lower_case_title}"
	mkdir -p "${FILE_PATH}"

	image="${image:-./banner.webp}"
	{
	    echo "---"
	    echo "title: \"$title\""
	    echo "description: \"$description\""
	    echo "date: $date"
	    echo "tags: [${tags_str}]"
	    echo "image: \"$image\""
	    echo "---"
	} > "${FILE_PATH}/index.mdx"

	CRAFT_PAGE_PATH="${SCRIPT_DIR}/src/pages/craft/${lower_case_title}.astro"

	{
		echo "---"
		echo "import CraftLayout from '@/layouts/craft-layout.astro'"
		echo "---"
		echo ""
		echo "<CraftLayout craftId=\"${lower_case_title}\">"
		echo "</CraftLayout>"
	} > "${CRAFT_PAGE_PATH}"


	echo "-----"
	echo "Craft created in ${FILE_PATH}/index.mdx and ${CRAFT_PAGE_PATH}"
	echo "-----"
elif [[ "$CONTENT_TYPE" == "project" ]]; then

	require "name" "${name:-}"
	require "description" "${description:-}"
	require "image" "${image:-}"
	require "link" "${link:-}"
	require "tags" "${tags:-}"
	require "startDate" "${startDate:-}"

	date -d "$startDate" >/dev/null 2>&1 || {
		echo "Invalid start date: $startDate"
		exit 1
	}
	
	lower_case_name="${name,,}"
	lower_case_name="${lower_case_title// /-}"

	FILE_PATH="${SCRIPT_DIR}/src/content/projects/${lower_case_name}"
	mkdir -p "${FILE_PATH}"
	
	tags_str=$(join_array "${tags[@]}")

	isCompleted="${isCompleted:-false}"
	{
	    echo "---"
	    echo "name: \"$name\""
	    echo "description: \"$description\""
	    echo "tags: [${tags_str}]"
	    echo "image: \"$image\""
			echo "startDate: $startDate"
			echo "link: '$link'"
	    echo "isCompleted: $isCompleted"
			[[ -n "${endDate:-}" ]] && echo "endDate: $endDate"
	    echo "---"
	} > "${FILE_PATH}/index.mdx"

	echo "-----"
	echo "Project created in ${FILE_PATH}/index.mdx"
	echo "-----"

else
	require "name" "${name:-}"
	require "avatar" "${avatar:-}"
	require "pronouns" "${pronouns:-}"

	lower_case_name="${name,,}"
	lower_case_name="${lower_case_title// /-}"

	FILE_PATH="${SCRIPT_DIR}/src/content/authors/${lower_case_name}.mdx"

	{
	    echo "---"
	    echo "name: \"$name\""
	    echo "pronouns: \"$pronouns\""
			echo "avatar: '${avatar}'"
			echo "bio: \"${bio}\""
			echo "website: '$website'"
			echo "twitter: \"${twitter}\""
			echo "github: \"${github}\""
			echo "linkedin: \"${linkedin}\""
			echo "discord: \"${discord}\""
	    echo "---"
	} > "${FILE_PATH}"

	echo "-----"
	echo "Author created in ${FILE_PATH}"
	echo "-----"
fi
