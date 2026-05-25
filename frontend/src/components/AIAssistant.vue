<template>
  <div class="ai-assistant-wrapper">
    <!-- Floating Trigger Button -->
    <v-btn
      aria-label="Toggle AI assistant"
      class="ai-trigger-btn"
      :class="{ 'chat-active': isOpen }"
      color="primary"
      elevation="8"
      size="large"
      @click="toggleChat"
    >
      <v-icon size="28">{{ isOpen ? 'mdi-close' : 'mdi-robot-outline' }}</v-icon>
      <span v-if="!isOpen && unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
    </v-btn>

    <!-- Chat Window Container -->
    <transition name="slide-up">
      <div v-if="isOpen" class="ai-chat-window glass-panel">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-bot-info">
            <div class="bot-avatar-pulse">
              <v-icon color="white" size="20">mdi-robot</v-icon>
            </div>
            <div>
              <h3 class="bot-name">Mindstores AI</h3>
              <span class="bot-status">Online Assistant</span>
            </div>
          </div>
          <v-btn
            aria-label="Minimize chat"
            color="white"
            icon="mdi-minus"
            size="small"
            variant="text"
            @click="isOpen = false"
          />
        </div>

        <!-- Message List -->
        <div ref="messageContainer" class="chat-messages">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message-row', msg.sender === 'user' ? 'msg-user' : 'msg-bot']"
          >
            <!-- Avatar for bot -->
            <div v-if="msg.sender === 'bot'" class="message-avatar">
              <v-icon size="16">mdi-robot-outline</v-icon>
            </div>
            
            <div class="message-bubble">
              <!-- Text content -->
              <p class="message-text" v-html="msg.text" />
              
              <!-- Rich Product Cards inside bubble if any -->
              <div v-if="msg.products && msg.products.length > 0" class="chat-product-list">
                <div v-for="prod in msg.products" :key="prod.product_id" class="chat-product-card">
                  <img :alt="prod.name" class="chat-product-img" :src="prod.image_url || 'https://via.placeholder.com/150'">
                  <div class="chat-product-details">
                    <h4 class="chat-product-title">{{ prod.name }}</h4>
                    <span class="chat-product-price">{{ formatPrice(prod.price) }}</span>
                    <v-btn
                      class="chat-add-btn mt-1"
                      color="primary"
                      density="compact"
                      :loading="addingProductIds.has(prod.product_id)"
                      @click="addProductToCart(prod)"
                    >
                      Add to Cart
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Cart actions inside bubble -->
              <div v-if="msg.cartActions" class="chat-cart-actions">
                <v-btn
                  class="mr-2 text-none"
                  color="teal"
                  size="small"
                  to="/cart"
                  variant="flat"
                >
                  View Cart
                </v-btn>
                <v-btn
                  class="text-none"
                  color="primary"
                  size="small"
                  to="/payment"
                  variant="outlined"
                >
                  Checkout
                </v-btn>
              </div>

              <span class="message-time">{{ msg.time }}</span>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="message-row msg-bot">
            <div class="message-avatar">
              <v-icon size="16">mdi-robot-outline</v-icon>
            </div>
            <div class="message-bubble typing-bubble">
              <span class="dot" />
              <span class="dot" />
              <span class="dot" />
            </div>
          </div>
        </div>

        <!-- Quick Reply Chips -->
        <div v-if="!isTyping" class="chat-quick-replies">
          <button
            v-for="(reply, idx) in quickReplies"
            :key="idx"
            class="quick-reply-chip"
            @click="sendQuickReply(reply)"
          >
            {{ reply.label }}
          </button>
        </div>

        <!-- Input Bar -->
        <div class="chat-input-bar">
          <input
            ref="inputField"
            v-model="inputText"
            class="chat-input"
            placeholder="Ask AI anything..."
            type="text"
            @keyup.enter="sendMessage"
          >
          <button aria-label="Send message" class="chat-send-btn" :disabled="!inputText.trim()" @click="sendMessage">
            <v-icon>mdi-send</v-icon>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useAppStore } from '@/stores/app'
  import { useCartStore } from '@/stores/cart'
  import { formatCurrencyAmount } from '@/utils/currency'
  import { extractProductItems, fetchProductList } from '@/utils/products'

  const appStore = useAppStore()
  const cartStore = useCartStore()

  const isOpen = ref(false)
  const isTyping = ref(false)
  const inputText = ref('')
  const unreadCount = ref(0)
  const messageContainer = ref(null)
  const inputField = ref(null)
  const addingProductIds = ref(new Set())

  const messages = ref([
    {
      sender: 'bot',
      text: 'Hi there! I am your <strong>Mindstores AI Shopping Agent</strong>. I can recommend products, search the catalog, and help manage your cart. Try typing something or select a quick option below!',
      time: getCurrentTime()
    }
  ])

  const quickReplies = [
    { label: '🎁 Suggest Gift', query: 'recommend a gift' },
    { label: '🔥 Best Sellers', query: 'show best sellers' },
    { label: '💻 Tech Gadgets', query: 'search electronics' },
    { label: '🛒 Check Cart', query: 'check my cart total' }
  ]

  const userCurrency = computed(() => appStore.user?.currency || 'USD')

  function getCurrentTime() {
    const now = new Date()
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatPrice(price) {
    return formatCurrencyAmount(price, userCurrency.value)
  }

  function toggleChat() {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      unreadCount.value = 0
      void nextTick(() => {
        scrollToBottom()
        inputField.value?.focus()
      })
    }
  }

  function scrollToBottom() {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  }

  async function addProductToCart(product) {
    if (!appStore.isAuthenticated) {
      // Simulate adding to UI/Store or prompt login
      messages.value.push({
        sender: 'bot',
        text: 'You need to login to add items to your cart. Click <a href="/login" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">here</a> to login or sign up!',
        time: getCurrentTime()
      })
      void nextTick(scrollToBottom)
      return
    }

    addingProductIds.value.add(product.product_id)
    try {
      await cartStore.addToCart(product.product_id, 1)
      messages.value.push({
        sender: 'bot',
        text: `Successfully added <strong>${product.name}</strong> to your shopping cart!`,
        time: getCurrentTime()
      })
    } catch (error) {
      console.error('Failed to add to cart:', error)
      messages.value.push({
        sender: 'bot',
        text: 'Sorry, I encountered an issue adding that item to your cart. Please try again.',
        time: getCurrentTime()
      })
    } finally {
      addingProductIds.value.delete(product.product_id)
      void nextTick(scrollToBottom)
    }
  }

  function sendQuickReply(reply) {
    inputText.value = reply.query
    sendMessage()
  }

  async function sendMessage() {
    const text = inputText.value.trim()
    if (!text) {return}

    // Add user message
    messages.value.push({
      sender: 'user',
      text,
      time: getCurrentTime()
    })

    inputText.value = ''
    void nextTick(scrollToBottom)

    // Trigger bot response after a short delay
    isTyping.value = true
    void nextTick(scrollToBottom)

    try {
      const response = await generateAIResponse(text)
      
      // Simulate realistic typing delay
      setTimeout(() => {
        isTyping.value = false
        messages.value.push({
          sender: 'bot',
          ...response,
          time: getCurrentTime()
        })
        if (!isOpen.value) {
          unreadCount.value++
        }
        void nextTick(scrollToBottom)
      }, 1000)
    } catch (error) {
      isTyping.value = false
      console.error('Failed to generate AI response:', error)
      messages.value.push({
        sender: 'bot',
        text: 'Sorry, I ran into a system error. Please try again.',
        time: getCurrentTime()
      })
      void nextTick(scrollToBottom)
    }
  }

  async function generateAIResponse(queryText) {
    const query = queryText.toLowerCase().trim()

    // 1. Help & Greetings
    if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query.includes('greetings')) {
      return {
        text: 'Hello there! How can I assist you with your shopping experience today?'
      }
    }
    
    if (query.includes('help') || query.includes('who are you') || query.includes('what can you do')) {
      return {
        text: 'I am the Mindstores AI assistant. You can ask me to:<br/>• <strong>Search products</strong> (e.g., "show electronics")<br/>• <strong>Suggest gifts</strong><br/>• <strong>Check your cart total</strong><br/>• Ask about <strong>policies</strong> (shipping, returns)'
      }
    }

    // 2. Shipping & Return Policies
    if (query.includes('shipping') || query.includes('deliver') || query.includes('delivery') || query.includes('ship')) {
      return {
        text: 'We offer global shipping! Domestic shipments usually arrive in <strong>3-5 business days</strong>, while international orders take <strong>7-10 business days</strong>.'
      }
    }

    if (query.includes('return') || query.includes('refund') || query.includes('policy')) {
      return {
        text: 'We offer a <strong>30-day return policy</strong>. If you are not satisfied, returns are completely free. Simply request a return label from your order invoice page!'
      }
    }

    // 3. Cart & Checkout queries
    if (query.includes('cart') || query.includes('total') || query.includes('checkout') || query.includes('items')) {
      const itemsCount = cartStore.itemCount
      const total = cartStore.totalAmount

      if (itemsCount === 0) {
        return {
          text: 'Your shopping cart is currently empty. Ask me for some product recommendations!'
        }
      }

      return {
        text: `You currently have <strong>${itemsCount} item(s)</strong> in your cart, with a total of <strong>${formatPrice(total)}</strong>.`,
        cartActions: true
      }
    }

    // 4. Product search/discovery
    const searchKeywords = ['show', 'find', 'search', 'recommend', 'look for', 'display', 'get', 'list', 'shop', 'buy', 'electronics', 'tech', 'gift', 'gadget', 'best', 'sale']
    const hasSearchIntent = searchKeywords.some(keyword => query.includes(keyword))

    if (hasSearchIntent) {
      // Determine what they are searching for
      let cleanQuery = query
      for (const kw of ['show me', 'search for', 'recommend a', 'recommend', 'find', 'show', 'search', 'look for', 'buy', 'get']) {
        if (cleanQuery.startsWith(kw)) {
          cleanQuery = cleanQuery.slice(kw.length).trim()
          break
        }
      }
      cleanQuery = cleanQuery.replace(/products|items|item|product|something/g, '').trim()

      try {
        const response = await fetchProductList()
        const allProducts = extractProductItems(response.data)

        let matches = []
        if (cleanQuery && cleanQuery !== 'best sellers' && cleanQuery !== 'gift' && cleanQuery !== 'gadgets' && cleanQuery !== 'electronics') {
          matches = allProducts.filter(p =>
            String(p.name || '').toLowerCase().includes(cleanQuery) ||
            String(p.category || '').toLowerCase().includes(cleanQuery) ||
            String(p.description || '').toLowerCase().includes(cleanQuery) ||
            String(p.company || '').toLowerCase().includes(cleanQuery)
          )
        } else if (cleanQuery === 'electronics' || query.includes('tech') || query.includes('gadget')) {
          matches = allProducts.filter(p => String(p.category || '').toLowerCase().includes('electronics'))
        } else {
          // General recommendation / best sellers
          matches = allProducts
        }

        // Limit to top 3 products
        const displayProducts = matches.slice(0, 3)

        return displayProducts.length > 0
          ? {
            text: 'I discovered these premium items matching your preference:',
            products: displayProducts
          }
          : {
            text: `I couldn't find exact matches for "${cleanQuery}", but here are some of our trending products:`,
            products: allProducts.slice(0, 3)
          }
      } catch (error) {
        console.error('AI assistant catalog search failed:', error)
        return {
          text: 'Oops, I had trouble searching the product catalog. Please try again in a moment.'
        }
      }
    }

    // Default response
    return {
      text: 'I am here to help you shop! Try asking: "show tech gadgets", "check my cart total", or "what is your return policy?"'
    }
  }

  watch(isOpen, (newVal) => {
    if (newVal) {
      unreadCount.value = 0
    }
  })
</script>

<style scoped>
.ai-assistant-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  font-family: 'Outfit', 'Inter', sans-serif;
}

.ai-trigger-btn {
  width: 56px !important;
  height: 56px !important;
  min-width: 56px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #4f46e5, #06b6d4) !important;
  color: white !important;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4) !important;
}

.ai-trigger-btn:hover {
  transform: scale(1.08) rotate(5deg);
  box-shadow: 0 6px 24px rgba(79, 70, 229, 0.5) !important;
}

.ai-trigger-btn.chat-active {
  transform: rotate(90deg);
  background: #334155 !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: bold;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.ai-chat-window {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 380px;
  height: 550px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  transition: all 0.3s ease;
}

/* Dark mode adjustment */
.v-theme--dark .ai-chat-window {
  background: rgba(18, 24, 36, 0.85) !important;
  border-color: rgba(248, 250, 252, 0.15) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

.chat-header {
  padding: 16px;
  background: linear-gradient(135deg, #4f46e5, #06b6d4);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-bot-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bot-avatar-pulse {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.bot-avatar-pulse::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.bot-name {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.bot-status {
  font-size: 11px;
  opacity: 0.8;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
  gap: 8px;
  max-width: 85%;
}

.msg-bot {
  align-self: flex-start;
}

.msg-user {
  align-self: flex-end;
  flex-direction: row-reverse;
  max-width: 80%;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.4;
  position: relative;
}

.msg-bot .message-bubble {
  background: #f1f5f9;
  color: #1e293b;
  border-top-left-radius: 4px;
}

.v-theme--dark .msg-bot .message-bubble {
  background: #1e293b !important;
  color: #f1f5f9 !important;
}

.msg-user .message-bubble {
  background: #4f46e5;
  color: white;
  border-top-right-radius: 4px;
}

.message-text {
  margin: 0;
  word-break: break-word;
}

.message-text :deep(a) {
  text-decoration: underline;
}

.message-time {
  display: block;
  font-size: 9px;
  opacity: 0.6;
  text-align: right;
  margin-top: 4px;
}

.typing-bubble {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}

.typing-bubble .dot {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-bubble .dot:nth-child(1) { animation-delay: -0.32s; }
.typing-bubble .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-quick-replies {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  overflow-x: auto;
  flex-wrap: nowrap;
  scrollbar-width: none;
}

.chat-quick-replies::-webkit-scrollbar {
  display: none;
}

.quick-reply-chip {
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #4f46e5;
  background: rgba(79, 70, 229, 0.05);
  color: #4f46e5;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.v-theme--dark .quick-reply-chip {
  border-color: #818cf8;
  color: #818cf8;
  background: rgba(129, 140, 248, 0.05);
}

.quick-reply-chip:hover {
  background: #4f46e5;
  color: white !important;
  transform: translateY(-1px);
}

.v-theme--dark .quick-reply-chip:hover {
  background: #818cf8;
  color: #090d16 !important;
}

.chat-product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.chat-product-card {
  display: flex;
  gap: 10px;
  background: white;
  border-radius: 12px;
  padding: 8px;
  border: 1px solid #e2e8f0;
}

.v-theme--dark .chat-product-card {
  background: #121824;
  border-color: #334155;
}

.chat-product-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.chat-product-details {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.chat-product-title {
  font-size: 12px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  color: #1e293b;
}

.v-theme--dark .chat-product-title {
  color: #f1f5f9;
}

.chat-product-price {
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
}

.v-theme--dark .chat-product-price {
  color: #2dd4bf;
}

.chat-add-btn {
  font-size: 10px !important;
  height: 24px !important;
  text-transform: none !important;
}

.chat-cart-actions {
  margin-top: 8px;
  display: flex;
}

.chat-input-bar {
  display: flex;
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  gap: 8px;
}

.v-theme--dark .chat-input-bar {
  border-top-color: #334155;
}

.chat-input {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  outline: none;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
}

.v-theme--dark .chat-input {
  border-color: #475569;
  background: #121824;
  color: #f1f5f9;
}

.chat-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

.chat-send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  background: #3730a3;
  transform: scale(1.05);
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .ai-chat-window {
    width: calc(100vw - 32px);
    height: 480px;
    right: -8px;
  }
}
</style>
