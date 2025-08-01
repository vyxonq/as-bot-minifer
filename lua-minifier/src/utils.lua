local function trim(s)
    return s:match("^%s*(.-)%s*$")
end

local function split(s, delimiter)
    local result = {}
    for match in (s..delimiter):gmatch("(.-)"..delimiter) do
        table.insert(result, match)
    end
    return result
end

local function isEmpty(s)
    return s == nil or s == ""
end

local function replaceAll(s, old, new)
    return s:gsub(old, new)
end

return {
    trim = trim,
    split = split,
    isEmpty = isEmpty,
    replaceAll = replaceAll
}