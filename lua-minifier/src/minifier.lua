local function removeComments(code)
    return code:gsub("%-%-%[.-%]%s*", ""):gsub("%-%-.*\n", "\n")
end

local function removeWhitespace(code)
    return code:gsub("%s+", " "):gsub(" %s+", " "):gsub("\n%s+", "\n"):gsub("%s+\n", "\n")
end

local function renameLocalVariables(code)
    local localVars = {}
    local index = 1

    code = code:gsub("local%s+([%w_]+)", function(var)
        local newName = "v" .. index
        localVars[var] = newName
        index = index + 1
        return "local " .. newName
    end)

    for original, new in pairs(localVars) do
        code = code:gsub("%f[%w]" .. new .. "%f[%W]", original)
    end

    return code
end

local function minify(code)
    code = removeComments(code)
    code = removeWhitespace(code)
    code = renameLocalVariables(code)
    return code
end

return {
    minify = minify
}