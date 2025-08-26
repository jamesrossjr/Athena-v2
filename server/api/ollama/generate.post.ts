export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Get Ollama endpoint from request or use default
    const ollamaEndpoint = body.endpoint || 'http://192.168.12.236:8089'
    
    // Remove endpoint from body as it's not part of the Ollama API
    const { endpoint, ...ollamaBody } = body
    
    // Make request to Ollama API
    const response = await $fetch(`${ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: ollamaBody
    })
    
    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Ollama proxy error: ${error.message}`
    })
  }
})