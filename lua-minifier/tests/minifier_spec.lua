-- This file contains unit tests for the Lua minifier, ensuring that the minification process works correctly and that the output is functionally identical to the original Lua scripts.
-- credits to poggersbutsnots123


local minifier = require("minifier")

describe("Lua Minifier", function()
    it("should minify a simple Lua script", function()
        local input = [[
            -- This is a comment
            local a = 10
            local b = 20
            local sum = a + b
            print(sum)
        ]]
        local expected_output = "local a=10 local b=20 local sum=a+b print(sum)"
        local output = minifier.minify(input)
        assert.are.equal(expected_output, output)
    end)

    it("should remove unnecessary whitespace", function()
        local input = [[
            local    a    =    10
            
            local b = 20
            
            print(a + b)
        ]]
        local expected_output = "local a=10 local b=20 print(a+b)"
        local output = minifier.minify(input)
        assert.are.equal(expected_output, output)
    end)

    it("should preserve string literals", function()
        local input = [[
            local greeting = "Hello, World!" -- This should stay
            print(greeting)
        ]]
        local expected_output = 'local greeting="Hello, World!" print(greeting)'
        local output = minifier.minify(input)
        assert.are.equal(expected_output, output)
    end)

    it("should not minify reserved keywords", function()
        local input = [[
            local function = "This is a function"
            print(function)
        ]]
        local expected_output = 'local function="This is a function" print(function)'
        local output = minifier.minify(input)
        assert.are.equal(expected_output, output)
    end)

    it("should handle multiple lines and comments correctly", function()
        local input = [[
            -- This is a comment
            local x = 5
            local y = 10 -- another comment
            local result = x + y
            
            print(result)
        ]]
        local expected_output = "local x=5 local y=10 local result=x+y print(result)"
        local output = minifier.minify(input)
        assert.are.equal(expected_output, output)
    end)
end)