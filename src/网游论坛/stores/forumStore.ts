import type { ForumSection } from '../types';
import { useSettingsStore } from './settingsStore';

export const useForumStore = defineStore('forum', () => {
  const settingsStore = useSettingsStore();

  const activeSection = ref<ForumSection>('A');
  const selectedPostId = ref<string | null>(null);
  const isGenerating = ref(false);
  const showEditor = ref(false);
  const showGenDialog = ref(false);
  const editorMode = ref<'post' | 'comment'>('post');

  const currentPosts = computed(() => settingsStore.settings.Zposts[activeSection.value]);

  const selectedPost = computed(() => {
    if (!selectedPostId.value) return null;
    return currentPosts.value.find(p => p.id === selectedPostId.value) ?? null;
  });

  /** 获取当前板块的显示名称 */
  const activeSectionName = computed(() => settingsStore.getSectionName(activeSection.value));

  function switchSection(section: ForumSection) {
    activeSection.value = section;
    selectedPostId.value = null;
  }

  function selectPost(postId: string) {
    selectedPostId.value = postId;
  }

  function goBack() {
    selectedPostId.value = null;
  }

  function deletePost(postId: string) {
    settingsStore.deletePost(activeSection.value, postId);
  }

  function openPostEditor() {
    editorMode.value = 'post';
    showEditor.value = true;
  }

  function openCommentEditor() {
    editorMode.value = 'comment';
    showEditor.value = true;
  }

  function closeEditor() {
    showEditor.value = false;
  }

  function openGenDialog() {
    showGenDialog.value = true;
  }

  function closeGenDialog() {
    showGenDialog.value = false;
  }

  return {
    activeSection,
    selectedPostId,
    isGenerating,
    showEditor,
    showGenDialog,
    editorMode,
    currentPosts,
    selectedPost,
    activeSectionName,
    switchSection,
    selectPost,
    goBack,
    deletePost,
    openPostEditor,
    openCommentEditor,
    closeEditor,
    openGenDialog,
    closeGenDialog,
  };
});
