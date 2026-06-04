package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.databinding.FragmentNotificationsBinding
import com.vet4pet.app.ui.adapters.NotificationAdapter
import com.vet4pet.app.ui.viewmodels.NotificationsViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class NotificationsFragment : Fragment() {

    private var _binding: FragmentNotificationsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: NotificationsViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }

        val adapter = NotificationAdapter(
            onClick   = { n -> if (!n.read) viewModel.markRead(n.id) },
            onDelete  = { n -> viewModel.delete(n.id) }
        )
        binding.rvNotifications.adapter = adapter

        // Swipe-to-delete
        ItemTouchHelper(object : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT or ItemTouchHelper.RIGHT) {
            override fun onMove(rv: RecyclerView, vh: RecyclerView.ViewHolder, t: RecyclerView.ViewHolder) = false
            override fun onSwiped(vh: RecyclerView.ViewHolder, dir: Int) {
                val notif = adapter.currentList[vh.adapterPosition]
                viewModel.delete(notif.id)
            }
        }).attachToRecyclerView(binding.rvNotifications)

        binding.btnMarkAllRead.setOnClickListener { viewModel.markAllRead() }

        viewModel.notifications.observe(viewLifecycleOwner) { state ->
            binding.progressNotifications.isVisible = state is UiState.Loading
            when (state) {
                is UiState.Success -> {
                    val list    = state.data
                    val hasUnread = list.any { !it.read }
                    binding.layoutEmpty.isVisible        = list.isEmpty()
                    binding.rvNotifications.isVisible    = list.isNotEmpty()
                    binding.btnMarkAllRead.isVisible     = hasUnread
                    adapter.submitList(list)
                }
                is UiState.Error -> {
                    binding.layoutEmpty.isVisible = true
                }
                else -> {}
            }
        }

        viewModel.load()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
